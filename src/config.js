const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const configPath = path.resolve(__dirname, '../config.yaml');
const fileContents = fs.readFileSync(configPath, 'utf8');
const config = yaml.load(fileContents);

const { ABI, contracts, textKeys, providerConfig } = config;

module.exports = { ABI, contracts, textKeys, providerConfig };
