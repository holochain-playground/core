import { now } from '@holochain-open-dev/common';
import { HeaderType, } from '@holochain-open-dev/core-types';
import { hash } from '../../../processors/hash';
import { hashEntry } from '../utils';
import { getAuthor, getNextHeaderSeq, getTipOfChain } from './utils';
export function buildShh(header) {
    return {
        header: {
            content: header,
            hash: hash(header),
        },
        signature: Uint8Array.from([]),
    };
}
export function buildDna(dnaHash, agentId) {
    const dna = {
        author: agentId,
        hash: dnaHash,
        timestamp: now(),
        type: HeaderType.Dna,
    };
    return dna;
}
export function buildAgentValidationPkg(state, membrane_proof) {
    const pkg = {
        ...buildCommon(state),
        membrane_proof,
        type: HeaderType.AgentValidationPkg,
    };
    return pkg;
}
export function buildCreate(state, entry, entry_type) {
    const entry_hash = hashEntry(entry);
    const create = {
        ...buildCommon(state),
        entry_hash,
        entry_type,
        type: HeaderType.Create,
    };
    return create;
}
export function buildUpdate(state, entry, entry_type, original_entry_address, original_header_address) {
    const entry_hash = hashEntry(entry);
    const update = {
        ...buildCommon(state),
        entry_hash,
        entry_type,
        original_entry_address,
        original_header_address,
        type: HeaderType.Update,
    };
    return update;
}
/** Helpers */
function buildCommon(state) {
    const author = getAuthor(state);
    const header_seq = getNextHeaderSeq(state);
    const prev_header = getTipOfChain(state);
    const timestamp = now();
    return {
        author,
        header_seq,
        prev_header,
        timestamp,
    };
}
//# sourceMappingURL=builder-headers.js.map