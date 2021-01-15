import { buildCreate, buildShh } from '../cell/source-chain/builder-headers';
import { putElement } from '../cell/source-chain/put';
// Creates a new Create header and its entry in the source chain
export const create_entry = (zome_index, cell) => async (args) => {
    const entry = { entry_type: 'App', content: args.content };
    const dna = cell.getSimulatedDna();
    const entryDefIndex = dna.zomes[zome_index].entry_defs.findIndex(entry_def => entry_def.id === args.entry_def_id);
    if (entryDefIndex < 0) {
        throw new Error(`Given entry def id ${args.entry_def_id} does not exist in this zome`);
    }
    const entry_type = {
        App: {
            id: entryDefIndex,
            zome_id: zome_index,
            visibility: dna.zomes[zome_index].entry_defs[entryDefIndex].visibility,
        },
    };
    const create = buildCreate(cell.state, entry, entry_type);
    const element = {
        signed_header: buildShh(create),
        entry,
    };
    putElement(element)(cell.state);
    return element.signed_header.header.hash;
};
// Creates a new Create header and its entry in the source chain
/* export const update = (entry: Entry, entry_type: EntryType, original_header_hash: Hash): HdkAction => (
  state: CellState
): Element => {
  const create = buildUpdate(state, entry, entry_type, null, original_header_hash);

  const element: Element = {
    header: create,
    maybe_entry: entry,
  };

  return element;
};
 */
//# sourceMappingURL=actions.js.map