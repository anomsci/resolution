const { ethers } = require('ethers');
const { ABI, contracts } = require('./config');
const { keccak256 } = require('js-sha3');
const { getProvider } = require('./providers');

const provider = getProvider();

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

    const namehash = ethers.namehash(ensName);
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
