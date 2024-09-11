const { textKeys } = require('./config');

const prepareResult = (results, context) => {
    const {
        isSubname,
        status,
        tokenData,
        owner,
        parentOwner,
        parentManager,
        parentTokenData
    } = context;

    const TEXT_KEYS = textKeys;

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

    const records = {
        ...resolvedData.address && { address: resolvedData.address },
        ...resolvedData.content && { content: resolvedData.content },
        ...resolvedData.text && { text: resolvedData.text },
    };

    const parent = {
        parent: {
            owner: parentOwner,
            manager: parentManager,
            tokenId: parentTokenData?.tokenId,
            status: parentTokenData?.status,
        }
    };

    if (isSubname) {
        return {
            ...status === 'wrapped' && { owner },
            manager: resolvedData.manager,
            ...records,
            ...status === 'wrapped' && { tokenId: tokenData?.tokenId, status },
            ...parent
        };
    }

    return {
        owner,
        manager: resolvedData.manager,
        ...records,
        tokenId: tokenData?.tokenId,
        status,
    };
};

module.exports = prepareResult;
