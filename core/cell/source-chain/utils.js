import { serializeHash } from '@holochain-open-dev/common';
import { HeaderType, } from '@holochain-open-dev/core-types';
export function getTipOfChain(cellState) {
    return cellState.sourceChain[0];
}
export function getAuthor(cellState) {
    return getHeaderAt(cellState, 0).header.content.author;
}
export function getDnaHash(state) {
    const firstHeaderHash = state.sourceChain[state.sourceChain.length - 1];
    const dna = state.CAS[serializeHash(firstHeaderHash)];
    return dna.header.content.hash;
}
export function getHeaderAt(cellState, index) {
    const headerHash = cellState.sourceChain[index];
    return cellState.CAS[serializeHash(headerHash)];
}
export function getNextHeaderSeq(cellState) {
    return cellState.sourceChain.length;
}
export function getElement(state, headerHash) {
    const signed_header = state.CAS[serializeHash(headerHash)];
    let entry;
    if (signed_header.header.content.type == HeaderType.Create ||
        signed_header.header.content.type == HeaderType.Update) {
        entry = state.CAS[serializeHash(signed_header.header.content.entry_hash)];
    }
    return { signed_header, entry };
}
export function getCellId(state) {
    const author = getAuthor(state);
    const dna = getDnaHash(state);
    return [dna, author];
}
export function getNonPublishedDhtOps(state) {
    const nonPublishedDhtOps = {};
    for (const dhtOpHash of Object.keys(state.authoredDHTOps)) {
        const authoredValue = state.authoredDHTOps[dhtOpHash];
        if (authoredValue.last_publish_time === undefined) {
            nonPublishedDhtOps[dhtOpHash] = authoredValue.op;
        }
    }
    return nonPublishedDhtOps;
}
//# sourceMappingURL=utils.js.map