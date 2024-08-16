const { ethers } = require('ethers');
const { ABI } = require('./config/abi');
const { contracts } = require('./config/contracts');
const { keccak256 } = require('js-sha3');
const dotenv = require('dotenv');

dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

const getNamehash = (name) => {
    return name.split('.')
        .reverse()
        .reduce((node, label) => {
            const labelHash = keccak256(label);
            return '0x' + keccak256(Buffer.from(node.slice(2) + labelHash, 'hex'));
        }, '0x0000000000000000000000000000000000000000000000000000000000000000');
  };

function resolveWrappedTokenId(namehash) {
    return BigInt(namehash).toString();
}

function resolveUnwrappedTokenId(label) {
    const labelHash = '0x' + keccak256(label);
    return BigInt(labelHash).toString();
}

async function validateTokenIds(ensName) {
    if (!ABI.name_wrapper || !ABI.registrar) {
        throw new Error('ABI is not defined. Please ensure that the ABI files are correctly imported.');
    }

    const namehash = getNamehash(ensName);
    const wrappedTokenId = resolveWrappedTokenId(namehash);
    const label = ensName.split('.')[0];
    const unwrappedTokenId = resolveUnwrappedTokenId(label);

    const nameWrapperContract = new ethers.Contract(contracts.name_wrapper, ABI.name_wrapper, provider);
    const registrarContract = new ethers.Contract(contracts.registrar, ABI.registrar, provider);

    try {
        const wrappedOwner = await nameWrapperContract.ownerOf(wrappedTokenId);
        if (wrappedOwner && wrappedOwner !== ethers.ZeroAddress) {
            return { tokenId: wrappedTokenId, status: 'wrapped', owner: wrappedOwner };
        }
    } catch (e) {
        console.error(`Failed to validate wrapped tokenId ${wrappedTokenId} against nameWrapper contract:`, e);
    }

    try {
        const unwrappedOwner = await registrarContract.ownerOf(unwrappedTokenId);
        if (unwrappedOwner && unwrappedOwner !== ethers.ZeroAddress) {
            return { tokenId: unwrappedTokenId, status: 'unwrapped', owner: unwrappedOwner };
        }
    } catch (e) {
        console.error(`Failed to validate unwrapped tokenId ${unwrappedTokenId} against registrar contract:`, e);
    }

    return null;
}

module.exports = { validateTokenIds };
