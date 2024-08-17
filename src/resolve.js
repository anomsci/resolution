const { ethers } = require("ethers");
const { MulticallProvider } = require("@ethers-ext/provider-multicall");
const dotenv = require('dotenv');
const { decodeContentHash } = require('./contentHash');
const { ABI } = require('./config/abi');
const { contracts } = require('./config/contracts');
const { validateTokenIds } = require('./tokenResolver');
const { ens_normalize } = require('@adraffy/ens-normalize');

dotenv.config();

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

        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const multicallProvider = new MulticallProvider(provider);

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
        const { tokenId, status, owner } = tokenData || {};

        const resolver = await multicallProvider.getResolver(name);
        if (!resolver) {
            console.error(`No resolver found for ${name}`);
            return null;
        }

        const contract = new ethers.Contract(resolver.address, ABI.resolver, multicallProvider);

        const TEXT_KEYS = [
            'avatar', 'description', 'display', 'email', 'keywords', 'mail', 
            'notice', 'location', 'phone', 'url'
        ];

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
            ...TEXT_KEYS.map(key => resolver.getText(key).catch(() => null).then(result => {
                if (result !== null && result !== undefined) {
                    return { key, value: result };
                }
                return null;
            })),
        ];

        const results = await Promise.all(calls);

        const resolvedData = results.reduce((acc, item) => {
            if (item && item.value) {
                if (TEXT_KEYS.includes(item.key)) {
                    acc.text = acc.text || {};
                    acc.text[item.key] = item.value;
                } else {
                    acc[item.key] = item.value;
                }
            }
            return acc;
        }, {});

        if (isSubname) {
            if (status !== 'wrapped') {
                return {
                    manager: resolvedData.manager,
                    ...resolvedData.address && { address: resolvedData.address },
                    ...resolvedData.content && { content: resolvedData.content },
                    ...resolvedData.text && { text: resolvedData.text },
                    parent: {
                        owner: parentOwner,
                        manager: parentManager,
                        namehash: parentNamehash,
                        tokenId: parentTokenData?.tokenId,
                        status: parentTokenData?.status,
                    }
                };
            }

            return {
                owner,
                manager: resolvedData.manager,
                ...resolvedData.address && { address: resolvedData.address },
                ...resolvedData.content && { content: resolvedData.content },
                ...resolvedData.text && { text: resolvedData.text },
                namehash,
                tokenId,
                status,
                parent: {
                    owner: parentOwner,
                    manager: parentManager,
                    namehash: parentNamehash,
                    tokenId: parentTokenData?.tokenId,
                    status: parentTokenData?.status,
                }
            };
        }

        return {
            owner,
            manager: resolvedData.manager,
            ...resolvedData.address && { address: resolvedData.address },
            ...resolvedData.content && { content: resolvedData.content },
            ...resolvedData.text && { text: resolvedData.text },
            namehash,
            tokenId,
            status,
        };

    } catch (error) {
        console.error(`Failed to resolve ENS name ${nameInput}: ${error.message}`);
        return null;
    }
};

module.exports = { resolve };
