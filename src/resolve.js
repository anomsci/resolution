const { ethers } = require("ethers");
const { MulticallProvider } = require("@ethers-ext/provider-multicall");
const dotenv = require('dotenv');
const { decodeContentHash } = require('./contentHash');
const { ABI } = require('./config/abi');
const { contracts } = require('./config/contracts');

dotenv.config();

const validateEnsName = (name) => {
    try {
        ethers.namehash(name);
    } catch (error) {
        if (error.code === 'INVALID_ARGUMENT') {
            throw new Error(`Invalid ENS name: ${error.shortMessage}`);
        }
        throw error;
    }
};

const resolve = async (name) => {
    try {
        validateEnsName(name);

        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const multicallProvider = new MulticallProvider(provider);

        const ensRegistryAddress = contracts.REGISTRY;
        const ensRegistry = new ethers.Contract(ensRegistryAddress, ABI.REGISTRY, multicallProvider);

        const namehash = ethers.namehash(name);

        const owner = await ensRegistry.owner(namehash);

        const resolver = await multicallProvider.getResolver(name);
        if (!resolver) {
            console.error(`No resolver found for ${name}`);
            return { owner };
        }

        const contract = new ethers.Contract(resolver.address, ABI.RESOLVER, multicallProvider);

        const textChangedFilter = contract.filters.TextChanged(namehash);

        const logs = await contract.queryFilter(textChangedFilter);
        const textKeys = [...new Set(logs.map(log => log.args.key))];

        const calls = [
            { key: 'owner', value: owner },
            contract.addr(namehash).catch(() => null).then(result => ({ key: 'address', value: result })),
            contract.contenthash(namehash).catch(() => null).then(result => {
                const decoded = decodeContentHash(result);
                return { key: 'content', value: decoded };
            }),
            ...textKeys.map(key => resolver.getText(key).catch(() => null).then(result => ({ key, value: result }))),
        ];

        const results = await Promise.all(calls);

        const resolvedData = results.reduce((acc, { key, value }) => {
            if (value) acc[key] = value;
            return acc;
        }, {});

        return resolvedData;

    } catch (error) {
        console.error(`Failed to resolve ENS name ${name}: ${error.message}`);
        return null;
    }
};

module.exports = { resolve };
