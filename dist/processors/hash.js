import { serializeHash } from '@holochain-open-dev/common';
// @ts-ignore
import blake from 'blakejs';
import * as buffer from 'buffer';
// From https://github.com/holochain/holochain/blob/dc0cb61d0603fa410ac5f024ed6ccfdfc29715b3/crates/holo_hash/src/encode.rs
// @ts-ignore
window.Buffer = buffer.Buffer;
export function hash(content) {
    const contentString = typeof content === 'string' ? content : JSON.stringify(content);
    return blake.blake2b(contentString, null, 32);
}
export const hashLocation = {};
export function location(hash) {
    if (hashLocation[hash])
        return hashLocation[hash];
    const hash128 = blake.blake2b(hash, null, 16);
    const out = [hash128[0], hash128[1], hash128[2], hash128[3]];
    for (let i = 4; i < 16; i += 4) {
        out[0] ^= hash128[i];
        out[1] ^= hash128[i + 1];
        out[2] ^= hash128[i + 2];
        out[3] ^= hash128[i + 3];
    }
    const view = new DataView(new Uint8Array(out).buffer, 0);
    return view.getUint32(0, false);
}
// We return the distance as the shortest distance between two hashes in the circle
export function distance(hash1, hash2) {
    const location1 = location(serializeHash(hash1));
    const location2 = location(serializeHash(hash2));
    return Math.min(location1 - location2, location2 - location1);
}
export function compareBigInts(a, b) {
    if (a > b) {
        return 1;
    }
    if (a < b) {
        return -1;
    }
    return 0;
}
//# sourceMappingURL=hash.js.map