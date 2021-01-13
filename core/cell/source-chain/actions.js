import { buildCreate, buildShh } from './builder-headers';
// Creates a new Create header and its entry in the source chain
export const create = (entry, entry_type) => async (state) => {
    const create = buildCreate(state, entry, entry_type);
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