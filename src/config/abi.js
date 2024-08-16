const ABI = {
    REGISTRY: [
        "function owner(bytes32 node) external view returns (address)"
    ],
    RESOLVER: [
        "function addr(bytes32) view returns (address)",
        "function contenthash(bytes32) view returns (bytes)",
        "function text(bytes32, string) view returns (string)",
        "event TextChanged(bytes32 indexed node, string indexed key, string key)"
    ]
};

module.exports = { ABI };
