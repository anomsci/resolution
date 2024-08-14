require('dotenv').config();
const Web3 = require('web3');
const contentHash = require('content-hash');
const { namehash, resolveTokenId1155, resolveTokenId721 } = require('./tokenResolver');

const provider = new Web3.default.providers.HttpProvider(process.env.HTTP_PROVIDER_URL);
const web3 = new Web3.default(provider);

const ensPublicResolverABI = [
  { constant: true, inputs: [{ name: 'node', type: 'bytes32' }], name: 'contenthash', outputs: [{ name: '', type: 'bytes' }], payable: false, stateMutability: 'view', type: 'function' },
  { constant: true, inputs: [{ name: 'node', type: 'bytes32' }], name: 'addr', outputs: [{ name: '', type: 'address' }], payable: false, stateMutability: 'view', type: 'function' },
  { constant: false, inputs: [{ internalType: "bytes[]", name: "data", type: "bytes[]" }], name: "multicall", outputs: [{ internalType: "bytes[]", name: "results", type: "bytes[]" }], payable: false, stateMutability: "nonpayable", type: "function" }
];

const ensRegistryABI = [
  { constant: true, inputs: [{ name: "node", type: "bytes32" }], name: "owner", outputs: [{ name: "", type: "address" }], payable: false, stateMutability: "view", type: "function" }
];

const ensPublicResolverAddresses = ['0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41', '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63'];
const ensRegistryAddress = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
const ensNameWrapperAddress = '0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401';
const contractAddresses = [...ensPublicResolverAddresses, ensRegistryAddress, ensNameWrapperAddress];

const decodeContentHash = (encodedContentHash) => {
  if (!encodedContentHash || encodedContentHash === '0x') return null;
  const codec = contentHash.getCodec(encodedContentHash);
  const decoded = contentHash.decode(encodedContentHash);
  return codec === 'ipfs-ns' ? { type: 'ipfs', hash: decoded } : codec === 'ipns-ns' ? { type: 'ipns', name: decoded } : null;
}

async function resolveENS(domain) {
  // ERC-1155 tokenId (Default)
  const namehashValue = await namehash(domain);
  const tokenId_1155 = resolveTokenId1155(namehashValue);

  // ERC-721 tokenId
  const label = domain.split('.')[0];
  const tokenId_721 = resolveTokenId721(label);

  const ensRegistryContract = new web3.eth.Contract(ensRegistryABI, ensRegistryAddress);

  let owner = '0x0000000000000000000000000000000000000000';
  let foundValidWalletAddress = false;
  try {
    owner = await ensRegistryContract.methods.owner(namehashValue).call();
  } catch (e) {
    // Error
  }

  const hasValidTokenId = tokenId_1155 || tokenId_721;

  for (let i = 0; i < ensPublicResolverAddresses.length; i++) {
      const resolverContract = new web3.eth.Contract(ensPublicResolverABI, ensPublicResolverAddresses[i]);

      try {
          // Encode the calls for multicall
          const addrCallData = resolverContract.methods.addr(namehashValue).encodeABI();
          const contentHashCallData = resolverContract.methods.contenthash(namehashValue).encodeABI();

          // Use multicall
          const results = await resolverContract.methods.multicall([addrCallData, contentHashCallData]).call();

          // Decode the results
          const walletAddress = web3.eth.abi.decodeParameter('address', results[0]);
          const encodedContentHash = web3.eth.abi.decodeParameter('bytes', results[1]);

          if (walletAddress && walletAddress !== '0x0000000000000000000000000000000000000000') {
            foundValidWalletAddress = true;
    
            // Check if owner is in contractAddresses and update if necessary
            if (contractAddresses.includes(owner)) {
              owner = walletAddress;
            }

          const decodedContentHash = decodeContentHash(encodedContentHash);

          return {
            owner,
            walletAddress,
            content: decodedContentHash || null,
            namehashValue,
            tokenId_1155,
            tokenId_721
          };
        }
      } catch (e) {
          // Continue to the next resolver if this one fails
      }
  }

  // Fallback if owner is in contractAddresses and the walletAddress was not found
  if (!foundValidWalletAddress && contractAddresses.includes(owner)) {
    owner = '0x0000000000000000000000000000000000000000';
  }

  // Fallback for no valid tokenId
  if (!hasValidTokenId) {
    console.log("Null ENS Data.");
    return null;
  }

  return {
    owner,
    namehashValue,
    tokenId_1155,
    tokenId_721
  }
}

module.exports = { resolveENS };
