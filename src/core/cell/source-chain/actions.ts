import { Entry, EntryType, Element } from '@holochain-open-dev/core-types';
import { buildCreate, buildShh, buildUpdate } from './builder-headers';
import { CellState } from '../state';
import { hash } from '../../../processors/hash';

export type HdkAction = (state: CellState) => Promise<Element>;

// Creates a new Create header and its entry in the source chain
export const create = (
  entry: Entry,
  entry_type: EntryType
): HdkAction => async (state: CellState): Promise<Element> => {
  const create = buildCreate(state, entry, entry_type);

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
