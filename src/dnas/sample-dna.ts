import { SimulatedDnaTemplate, SimulatedZome } from './simulated-dna';

export const sampleZome: SimulatedZome = {
  name: 'sample',
  entry_defs: [
    {
      id: 'sample_entry',
      visibility: 'Public',
    },
  ],
  zome_functions: {
    create_entry: {
      call: ({ create_entry }) => ({ content }) => {
        return create_entry({ content, entry_def_id: 'sample_entry' });
      },
      arguments: [{ name: 'content', type: 'any' }],
    },
    /*     update_entry: ({ content, type, original_header_hash }) => [],
    delete_entry: ({ deletes_address }) => [],
    create_link: ({ base, target, tag }) => [],
    delete_link: ({ link_add_address }) => [],
 */
  },
};

export function sampleDnaTemplate(): SimulatedDnaTemplate {
  const zomes = [sampleZome];
  return {
    zomes,
  };
}
