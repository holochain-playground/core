import { deserializeHash, serializeHash } from '@holochain-open-dev/common';
import { getSysMetaValHeaderHash, } from '@holochain-open-dev/core-types';
import { uniq } from 'lodash-es';
export function getValidationLimboDhtOps(state, status) {
    const pendingDhtOps = {};
    for (const dhtOpHash of Object.keys(state.validationLimbo)) {
        const limboValue = state.validationLimbo[dhtOpHash];
        if (limboValue.status === status) {
            pendingDhtOps[dhtOpHash] = limboValue;
        }
    }
    return pendingDhtOps;
}
export function pullAllIntegrationLimboDhtOps(state) {
    const dhtOps = state.integrationLimbo;
    state.integrationLimbo = {};
    return dhtOps;
}
export function getHeadersForEntry(state, entryHash) {
    return state.metadata.system_meta[serializeHash(entryHash)]
        .map(h => {
        const hash = getSysMetaValHeaderHash(h);
        if (hash) {
            return state.CAS[serializeHash(hash)];
        }
        return undefined;
    })
        .filter(header => !!header);
}
export function getLinksForEntry(state, entryHash) {
    return state.metadata.link_meta
        .filter(({ key, value }) => (key.base = entryHash))
        .map(({ key, value }) => value);
}
export function getEntryDhtStatus(state, entryHash) {
    const meta = state.metadata.misc_meta[serializeHash(entryHash)];
    return meta
        ? meta.EntryStatus
        : undefined;
}
export function getEntryDetails(state, entryHash) {
    const entry = state.CAS[serializeHash(entryHash)];
    const headers = getHeadersForEntry(state, entryHash);
    const dhtStatus = getEntryDhtStatus(state, entryHash);
    return {
        entry,
        headers: headers,
        entry_dht_status: dhtStatus,
    };
}
export function getAllHeldEntries(state) {
    const allHeaders = Object.values(state.integratedDHTOps).map(dhtOpValue => dhtOpValue.op.header);
    const newEntryHeaders = allHeaders.filter(h => h.header.content.entry_hash);
    const allEntryHashes = newEntryHeaders.map(h => h.header.content.entry_hash);
    return uniq(allEntryHashes.map(serializeHash)).map(deserializeHash);
}
export function isHoldingEntry(state, entryHash) {
    return state.metadata.system_meta[serializeHash(entryHash)] !== undefined;
}
export function getDhtShard(state) {
    const heldEntries = getAllHeldEntries(state);
    const dhtShard = {};
    for (const entryHash of heldEntries) {
        dhtShard[serializeHash(entryHash)] = {
            details: getEntryDetails(state, entryHash),
            links: getLinksForEntry(state, entryHash),
        };
    }
    return dhtShard;
}
//# sourceMappingURL=get.js.map