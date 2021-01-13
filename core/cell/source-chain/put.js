import { hash } from '../../../processors/hash';
import { serializeHash } from '@holochain-open-dev/common';
export const putElement = (element) => (state) => {
    // Put header in CAS
    const headerHash = element.signed_header.header.hash;
    state.CAS[serializeHash(headerHash)] = element.signed_header;
    // Put entry in CAS if it exist
    if (element.entry) {
        const entryHash = hash(element.entry);
        state.CAS[serializeHash(entryHash)] = element.entry;
    }
    state.sourceChain.unshift(headerHash);
};
//# sourceMappingURL=put.js.map