const { ethers } = require("ethers");
const { getMulticallProvider } = require('./providers');
const { decodeContentHash } = require('./contentHash');
const { ABI, contracts, textKeys } = require('./config');
const { validateTokenIds } = require('./tokenResolver');
const { ens_normalize } = require('@adraffy/ens-normalize');
const { prepareResult } = require('./result');

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

const resolve = async (nameInput) => {
    try {
        const name = validateName(nameInput);

        const multicallProvider = getMulticallProvider();

        const ensRegistryAddress = contracts.registry;
        const ensRegistry = new ethers.Contract(ensRegistryAddress, ABI.registry, multicallProvider);

        const namehash = ethers.namehash(name);
        const labels = name.split('.');

        const isSubname = labels.length > 2;

        let parentNamehash, parentName, parentTokenData, parentManager, parentOwner;
        if (isSubname) {
            const parentDomain = labels.slice(1).join('.');
            parentName = validateName(parentDomain);
            parentNamehash = ethers.namehash(parentName);

            parentTokenData = await validateTokenIds(parentName);
            parentManager = await ensRegistry.owner(parentNamehash);
            parentOwner = parentTokenData?.owner;
        }

        const manager = await ensRegistry.owner(namehash);

        const tokenData = await validateTokenIds(name);
        const { status, owner } = tokenData || {};

        const resolver = await multicallProvider.getResolver(name);
        if (!resolver) {
            console.error(`No resolver found for ${name}`);
            return null;
        }

        const contract = new ethers.Contract(resolver.address, ABI.resolver, multicallProvider);

        const calls = [
            { key: 'manager', value: manager },
            contract.addr(namehash).catch(() => null).then(result => {
                if (result && result !== '0x0000000000000000000000000000000000000000') {
                    return { key: 'address', value: result };
                }
                return null;
            }),
            contract.contenthash(namehash).catch(() => null).then(result => {
                const decoded = decodeContentHash(result);
                if (decoded !== undefined) {
                    return { key: 'content', value: decoded };
                }
                return null;
            }),
            ...textKeys.map(key => resolver.getText(key).catch(() => null).then(result => {
                if (result !== null && result !== undefined) {
                    return { key, value: result };
                }
                return null;
            })),
        ];

        const results = await Promise.all(calls);

        const resolvedData = prepareResult(results, {
            isSubname,
            status,
            tokenData,
            owner,
            parentOwner,
            parentManager,
            parentTokenData
        });

        return resolvedData;

    } catch (error) {
        console.error(`Failed to resolve ENS name ${nameInput}: ${error.message}`);
        return null;
    }
};

module.exports = { resolve };
