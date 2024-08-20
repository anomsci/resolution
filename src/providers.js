const { ethers } = require("ethers");
const { MulticallProvider } = require("@ethers-ext/provider-multicall");
const dotenv = require('dotenv');
const { providerConfig } = require('./config');

dotenv.config();

let providerInstance = null;
let multicallProviderInstance = null;

const getProvider = () => {
    if (!providerInstance) {
        const rpcUrl = process.env[providerConfig.rpcEnv] || process.env.RPC_URL;
        providerInstance = new ethers.JsonRpcProvider(rpcUrl);
    }
    return providerInstance;
};

const getMulticallProvider = () => {
    if (!multicallProviderInstance) {
        multicallProviderInstance = new MulticallProvider(getProvider());
    }
    return multicallProviderInstance;
};

module.exports = { getProvider, getMulticallProvider };
