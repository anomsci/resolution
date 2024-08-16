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

        const manager = await ensRegistry.owner(namehash);

        const tokenData = await validateTokenIds(name);
        const { tokenId, status, owner } = tokenData || {};

        const resolver = await multicallProvider.getResolver(name);
        if (!resolver) {
            console.error(`No resolver found for ${name}`);
            return { manager, tokenId, status, owner };
        }

        const contract = new ethers.Contract(resolver.address, ABI.resolver, multicallProvider);

        const textChangedFilter = contract.filters.TextChanged(namehash);

        const logs = await contract.queryFilter(textChangedFilter);
        const textKeys = [...new Set(logs.map(log => log.args.key))];

        const calls = [
            { key: 'owner', value: owner },
            { key: 'manager', value: manager },
            contract.addr(namehash).catch(() => null).then(result => ({ key: 'address', value: result })),
            contract.contenthash(namehash).catch(() => null).then(result => {
                const decoded = decodeContentHash(result);
                return { key: 'content', value: decoded };
            }),
            ...textKeys.map(key => resolver.getText(key).catch(() => null).then(result => ({ key, value: result }))),
            { key: 'tokenId', value: tokenId },
            { key: 'status', value: status },
        ];

        const results = await Promise.all(calls);

        const resolvedData = results.reduce((acc, { key, value }) => {
            if (value) acc[key] = value;
            return acc;
        }, {});

        return resolvedData;

    } catch (error) {
        console.error(`Failed to resolve ENS name ${nameInput}: ${error.message}`);
        return null;
    }
};

module.exports = { resolve };
