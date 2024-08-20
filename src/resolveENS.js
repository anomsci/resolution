const { ethers } = require("ethers");
const { getMulticallProvider } = require('./providers');
const { decodeContentHash } = require('./contentHash');
const { ABI, contracts, textKeys } = require('./config');
const { ens_normalize } = require('@adraffy/ens-normalize');

const validateName = (nameInput) => {
    try {
        const name = ens_normalize(nameInput);
        ethers.namehash(name);
        return name;
    } catch (error) {
        if (error.code === 'INVALID_ARGUMENT') {
            throw new Error(`Invalid ENS name: ${error.shortMessage}`);
        } else if (error.message.includes('ENS normalization failed')) {
            throw new Error(`ENS normalization failed for name ${nameInput}: ${error.message}`);
        }
        throw error;
    }
};

const resolveENS = async (name) => {
    const multicallProvider = getMulticallProvider();

    const ensRegistryAddress = contracts.registry;
    const ensRegistry = new ethers.Contract(ensRegistryAddress, ABI.registry, multicallProvider);

    const namehash = ethers.namehash(name);
    const labels = name.split('.');

    const isSubname = labels.length > 2;

    let parentNamehash, parentName, parentManager;
    if (isSubname) {
        const parentDomain = labels.slice(1).join('.');
        parentName = validateName(parentDomain);
        parentNamehash = ethers.namehash(parentName);

        parentManager = await ensRegistry.owner(parentNamehash);
    }

    const managerCall = ensRegistry.owner(namehash);
    const resolverCall = multicallProvider.getResolver(name);

    const [manager, resolver] = await Promise.all([managerCall, resolverCall]);

    if (!resolver) {
        throw new Error(`No resolver found for ${name}. Is the name registered?`);
    }

    const contract = new ethers.Contract(resolver.address, ABI.resolver, multicallProvider);

    const addrCall = contract.addr(namehash).catch(() => null);
    const contentHashCall = contract.contenthash(namehash).catch(() => null);
    const textCalls = textKeys.map(key => contract.text(namehash, key).catch(() => null));

    const [address, contentHash, ...textResults] = await Promise.all([
        addrCall,
        contentHashCall,
        ...textCalls
    ]);

    const results = [
        { key: 'manager', value: manager },
        (address && address !== '0x0000000000000000000000000000000000000000') ? { key: 'address', value: address } : null,
        (contentHash && decodeContentHash(contentHash) !== undefined) ? { key: 'content', value: decodeContentHash(contentHash) } : null,
        ...textResults.map((result, index) => result !== null && result !== undefined ? { key: textKeys[index], value: result } : null),
    ].filter(Boolean);

    return {
        results,
        isSubname,
        parentManager,
    };
};

module.exports = { resolveENS, validateName };
