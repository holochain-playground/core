import { Entry, EntryType, Element } from '@holochain-open-dev/core-types';
import { buildCreate, buildShh } from './builder-headers';
import { Cell } from '../../cell';

export type HdkAction = (zome_index: number, cell: Cell) => Promise<Element>;

// Creates a new Create header and its entry in the source chain
export const create_entry = (
  content: any,
  entry_def_id: string
): HdkAction => async (zome_index: number, cell: Cell): Promise<Element> => {
  const entry: Entry = { entry_type: 'App', content };
  const dna = cell.getSimulatedDna();

  const entryDefIndex = dna.zomes[zome_index].entry_defs.findIndex(
    entry_def => entry_def.id === entry_def_id
  );
  if (entryDefIndex < 0) {
    throw new Error(
      `Given entry def id ${entry_def_id} does not exist in this zome`
    );
  }

  const entry_type = {
    App: {
      id: entryDefIndex,
      zome_id: zome_index,
      visibility: dna.zomes[zome_index].entry_defs[entryDefIndex].visibility,
    },
  };

  const create = buildCreate(cell.state, entry, entry_type);

  const element: Element = {
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
