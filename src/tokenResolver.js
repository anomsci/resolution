const keccak256 = require('js-sha3').keccak256;
const { ens_normalize } = require('@adraffy/ens-normalize');

const namehash = (name) => {
  // Normalize the name using @adraffy/ens-normalize
  const normalized = ens_normalize(name);

  return normalized.split('.')
      .reverse()
      .reduce((node, label) => {
          // Convert label to a hash using keccak256 from js-sha3
          const labelHash = keccak256(label);
          // Concatenate node and labelHash (minus the '0x' prefix) and convert to a Buffer for hashing
          return '0x' + keccak256(Buffer.from(node.slice(2) + labelHash, 'hex'));
      }, '0x0000000000000000000000000000000000000000000000000000000000000000');
};

// Wrapped Names | ERC-1155 (Default)
function resolveTokenId1155(namehashValue) {
    return BigInt(namehashValue).toString();
}

// Unwrapped Names | ERC-721
function resolveTokenId721(label) {
    const labelHash = '0x' + keccak256(label); // Prefix 0x as js-sha3 returns without
    return BigInt(labelHash).toString();
}

module.exports = { namehash, resolveTokenId1155, resolveTokenId721 };