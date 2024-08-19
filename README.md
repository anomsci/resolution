
# Resolution
> ***@anomsci/resolution*** | A simple resolution library for Ethereum Name Service (ENS) domains.

## Getting Started
This library uses Node v20.16.0, with the core dependency for ENS name resolution being [Ethers](https://www.npmjs.com/package/ethers) (v6.13.2). To get started, install the library:
```
npm install @anomsci/resolution
```
## Usage
The most simple way to resolve a name is to import the `resolve` function from `@anomsci/resolution`, provide a name, then log the result to the console.
```
const { resolve } = require('@anomsci/resolution');

resolve('example.eth').then(console.log);
```
The resolution results for any name will contain information about the name ownership/management, the name's records (address, content, text), tokenId, wrapper status, and parent information (subnames only):
 - **owner**: Token holder address returned via an `ownerOf()` call to the ENS Name Wrapper or Registrar contract with the name's `tokenId`.
 - **manager**: Owner address returned via an `owner()` call to the ENS registry.
 - **address**: Address record returned via an `addr()` call to the name's resolver.
 - **content**: The decoded content hash returned via a `contenthash()` call to the name's resolver.
 - **text**: The text records based on the `textKeys` specified in `config.yaml` returned via a `getText()` call to the name's resolver.
 - **tokenId**: The calculated `tokenId` based on the `namehash` or `labelhash` of the name.
 - **status**: Name Wrapper status. Either `wrapped` or `unwrapped`.
 - **parent**: In cases of subname resolution, this corresponds to the token data of the parent name (e.g.. for the subname *sub.example.eth*, the parent is *example.eth*). The returned token data includes the `owner`, `manager`, `tokenId`, and `status` of the parent name.
```
{
  owner: 'OWNER_ADDRESS',
  manager: 'MANAGER_ADDRESS',
  address: 'ADDRESS_RECORD',
  content: {
    type: 'ipfs',
    name: 'IPFS_CID'
  },
  text: {
    avatar: 'AVATAR_URL',
    url: 'URL'
  },
  tokenId: 'TOKEN_ID',
  status: 'WRAPPER_STATUS',
  parent: {
    owner: 'PARENT_OWNER',
    manager: 'PARENT_MANAGER',
    tokenId: 'PARENT_TOKEN_ID',
    status: 'PARENT_WRAPPER_STATUS'
  }
}
```

## Config
To use the `resolve` function, an Ethereum Mainnet connection is required. This is set through the `RPC_URL` variable in the `.env`, where you can specify your HTTP JSON-RPC provider URL.
```
# URL for your Ethereum Mainnet JSON RPC Interface
RPC_URL=<YOUR_RPC_URL>
```
The library can be configured from the `config.yaml`. This contains the ABI for the calls used to different contracts in the resolution process, contract addresses, the `textKeys` used for resolving text records, and name of the `.env` variable for the provider URL. By default, the config contains the ABI for the `owner()`, `addr()`, `contenthash()`, and `ownerOf()` calls, contract addresses for the ENS registry, name wrapper, and registrar, and text keys corresponding to the Global Keys specified under [ERC-634: Storage of text records in ENS](https://eips.ethereum.org/EIPS/eip-634). The default `.env` variable name for the provider URL is `RPC_URL`.
```
ABI:
  registry:
    - "function owner(bytes32 node) external view returns (address)"
  resolver:
    - "function addr(bytes32) view returns (address)"
    - "function contenthash(bytes32) view returns (bytes)"
  name_wrapper:
    - "function ownerOf(uint256 id) view returns (address owner)"
  registrar:
    - "function ownerOf(uint256 tokenId) view returns (address)"

contracts:
  registry: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e"
  name_wrapper: "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401"
  registrar: "0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85"

textKeys:
  - "avatar"
  - "description"
  - "display"
  - "email"
  - "keywords"
  - "mail"
  - "notice"
  - "location"
  - "phone"
  - "url"

providerConfig:
  rpcEnv: "RPC_URL"

```
