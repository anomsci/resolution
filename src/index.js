const { resolveENS, validateName } = require('./resolveENS');
const { validateTokenIds } = require('./tokenResolver');
const { prepareResult } = require('./result');

const resolve = async (nameInput) => {
    try {
        const name = validateName(nameInput);

        const tokenData = await validateTokenIds(name);
        const { status, owner } = tokenData || {};

        let parentTokenData, parentOwner;
        const { results, isSubname, parentManager } = await resolveENS(name);

        if (isSubname) {
            const parentDomain = name.split('.').slice(1).join('.');
            parentTokenData = await validateTokenIds(parentDomain);
            parentOwner = parentTokenData?.owner;
        }

        const resolvedData = prepareResult(results, {
            isSubname,
            status,
            tokenData,
            owner,
            parentOwner,
            parentManager,
            parentTokenData
        });

        return resolvedData;

    } catch (error) {
        console.error(`Failed to resolve ENS name ${nameInput}: ${error.message}`);
        return null;
    }
};

module.exports = { resolve };
