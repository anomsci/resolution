const { ethers } = require("ethers");
const { MulticallProvider } = require("@ethers-ext/provider-multicall");
const dotenv = require('dotenv');

dotenv.config();

let providerInstance = null;
let multicallProviderInstance = null;

const getProvider = () => {
    if (!providerInstance) {
        providerInstance = new ethers.JsonRpcProvider(process.env.RPC_URL);
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
