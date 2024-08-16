const ABI = {
    registry: [
        "function owner(bytes32 node) external view returns (address)"
    ],
    resolver: [
        "function addr(bytes32) view returns (address)",
        "function contenthash(bytes32) view returns (bytes)",
        "function text(bytes32, string) view returns (string)",
        "event TextChanged(bytes32 indexed node, string indexed key, string key)"
    ],
    name_wrapper: [
        "function ownerOf(uint256 id) view returns (address owner)"
    ],
    registrar: [
        "function ownerOf(uint256 tokenId) view returns (address)"
    ]
};

module.exports = { ABI };
