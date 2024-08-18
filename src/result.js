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

    const TEXT_KEYS = [
        'avatar', 'description', 'display', 'email', 'keywords', 'mail', 
        'notice', 'location', 'phone', 'url'
    ];

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

    if (isSubname) {
        if (status !== 'wrapped') {
            return {
                manager: resolvedData.manager,
                ...resolvedData.address && { address: resolvedData.address },
                ...resolvedData.content && { content: resolvedData.content },
                ...resolvedData.text && { text: resolvedData.text },
                parent: {
                    owner: parentOwner,
                    manager: parentManager,
                    tokenId: parentTokenData?.tokenId,
                    status: parentTokenData?.status,
                }
            };
        }

        return {
            owner,
            manager: resolvedData.manager,
            ...resolvedData.address && { address: resolvedData.address },
            ...resolvedData.content && { content: resolvedData.content },
            ...resolvedData.text && { text: resolvedData.text },
            tokenId: tokenData?.tokenId,
            status,
            parent: {
                owner: parentOwner,
                manager: parentManager,
                tokenId: parentTokenData?.tokenId,
                status: parentTokenData?.status,
            }
        };
    }

    return {
        owner,
        manager: resolvedData.manager,
        ...resolvedData.address && { address: resolvedData.address },
        ...resolvedData.content && { content: resolvedData.content },
        ...resolvedData.text && { text: resolvedData.text },
        tokenId: tokenData?.tokenId,
        status,
    };
};

module.exports = { prepareResult };
