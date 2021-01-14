import { serializeHash } from '@holochain-open-dev/common';
/**
 * Returns the header hashes which don't have their DHTOps in the authoredDHTOps DB
 */
export function getNewHeaders(state) {
    return state.sourceChain.filter(headerHash => !Object.keys(state.authoredDHTOps).includes(serializeHash(headerHash)));
}
//# sourceMappingURL=get.js.map