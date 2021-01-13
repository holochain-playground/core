import { create } from '../core/cell/source-chain/actions';
import { hash } from '../processors/hash';
// TODO Actually code the Zome
export const sampleZome = {
    create_entry: ({ content, entry_type }) => [
        create({ entry_type: 'App', content }, {
            App: {
                id: entry_type,
                zome_id: 0,
                visibility: 'Public',
            },
        }),
    ],
    update_entry: ({ content, type, original_header_hash }) => [],
    delete_entry: ({ deletes_address }) => [],
    create_link: ({ base, target, tag }) => [],
    delete_link: ({ link_add_address }) => [],
};
export function sampleDna() {
    const zomes = {
        sample: sampleZome,
    };
    return {
        hash: hash(zomes),
        zomes,
    };
}
//# sourceMappingURL=sample-dna.js.map