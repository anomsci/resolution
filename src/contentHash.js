const contentHash = require('content-hash');

const decodeContentHash = (encodedContentHash) => {
  if (!encodedContentHash || encodedContentHash === '0x') return null;
  const codec = contentHash.getCodec(encodedContentHash);
  const decoded = contentHash.decode(encodedContentHash);
  return codec === 'ipfs-ns' ? { type: 'ipfs', hash: decoded } : codec === 'ipns-ns' ? { type: 'ipns', name: decoded } : null;
}

module.exports = { decodeContentHash };
