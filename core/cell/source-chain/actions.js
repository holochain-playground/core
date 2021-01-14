import { buildCreate, buildShh } from './builder-headers';
// Creates a new Create header and its entry in the source chain
export const create_entry = (content, entry_def_id) => async (zome_index, cell) => {
    const entry = { entry_type: 'App', content };
    const dna = cell.getSimulatedDna();
    const entryDefIndex = dna.zomes[zome_index].entry_defs.findIndex(entry_def => entry_def.id === entry_def_id);
    if (entryDefIndex < 0) {
        throw new Error(`Given entry def id ${entry_def_id} does not exist in this zome`);
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
    return element;
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