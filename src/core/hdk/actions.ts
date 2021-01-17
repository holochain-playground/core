import {
  Entry,
  EntryType,
  Element,
  Hash,
} from '@holochain-open-dev/core-types';
import { Cell } from '../cell';
import { buildCreate, buildShh } from '../cell/source-chain/builder-headers';
import { putElement } from '../cell/source-chain/put';

export type HostFunction<Fn extends Function> = (
  zome_index: number,
  cell: Cell
) => Fn;

export type CreateEntry = (args: {
  content: any;
  entry_def_id: string;
}) => Promise<Hash>;

// Creates a new Create header and its entry in the source chain
export const create_entry: HostFunction<CreateEntry> = (
  zome_index: number,
  cell: Cell
): CreateEntry => async (args: {
  content: any;
  entry_def_id: string;
}): Promise<Hash> => {
  const entry: Entry = { entry_type: 'App', content: args.content };
  const dna = cell.getSimulatedDna();

  const entryDefIndex = dna.zomes[zome_index].entry_defs.findIndex(
    entry_def => entry_def.id === args.entry_def_id
  );
  if (entryDefIndex < 0) {
    throw new Error(
      `Given entry def id ${args.entry_def_id} does not exist in this zome`
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
