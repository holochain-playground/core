import { create_entry } from '../core/cell/source-chain/actions';
export const sampleZome = {
    name: 'sample',
    entry_defs: [
        {
            id: 'sample_entry',
            visibility: 'Public',
        },
    ],
    zome_functions: {
        create_entry: ({ content }) => [create_entry(content, 'sample_entry')],
        update_entry: ({ content, type, original_header_hash }) => [],
        delete_entry: ({ deletes_address }) => [],
        create_link: ({ base, target, tag }) => [],
        delete_link: ({ link_add_address }) => [],
    },
};
export function sampleDnaTemplate() {
    const zomes = [sampleZome];
    return {
        zomes,
    };
}
//# sourceMappingURL=sample-dna.js.map