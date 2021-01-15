export const sampleZome = {
    name: 'sample',
    entry_defs: [
        {
            id: 'sample_entry',
            visibility: 'Public',
        },
    ],
    zome_functions: {
        create_entry: ({ create_entry }) => ({ content }) => {
            return create_entry(content, 'sample_entry');
        },
    },
};
export function sampleDnaTemplate() {
    const zomes = [sampleZome];
    return {
        zomes,
    };
}
//# sourceMappingURL=sample-dna.js.map