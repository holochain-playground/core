import { DHTOpType, } from '@holochain-open-dev/core-types';
import { hash } from '../../processors/hash';
export function hashEntry(entry) {
    if (entry.entry_type === 'Agent')
        return entry.content;
    return hash(entry);
}
export function getAppEntryType(entryType) {
    if (entryType.App)
        return entryType.App;
    return undefined;
}
export function getEntryTypeString(entryType) {
    const appEntryType = getAppEntryType(entryType);
    // TODO: FIX
    if (appEntryType)
        return appEntryType.id.toString();
    return entryType;
}
export function getDHTOpBasis(dhtOp) {
    switch (dhtOp.type) {
        case DHTOpType.StoreElement:
            return hash(dhtOp.header);
        case DHTOpType.StoreEntry:
            return dhtOp.header.header.content.entry_hash;
        case DHTOpType.RegisterUpdatedContent:
            return dhtOp.header.header.content.original_entry_address;
        case DHTOpType.RegisterAgentActivity:
            return dhtOp.header.header.content.author;
        case DHTOpType.RegisterAddLink:
            return dhtOp.header.header.content.base_address;
        case DHTOpType.RegisterRemoveLink:
            return dhtOp.header.header.content.base_address;
        case DHTOpType.RegisterDeletedBy:
            return dhtOp.header.header.content.deletes_address;
        case DHTOpType.RegisterDeletedEntryHeader:
            return dhtOp.header.header.content.deletes_entry_address;
        default:
            return undefined;
    }
}
//# sourceMappingURL=utils.js.map