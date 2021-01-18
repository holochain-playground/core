import { Hash } from '@holochain-open-dev/core-types';
import { hash } from '../../../processors/hash';
import { Cell } from '../../cell';
import { HostFn } from '../host-fn';

export type HashEntry = (args: { content: any }) => Promise<Hash>;

// Creates a new Create header and its entry in the source chain
export const hash_entry: HostFn<HashEntry> = (
  zome_index: number,
  cell: Cell
): HashEntry => async (args: { content: any }): Promise<Hash> => {
  return hash(args.content);
};
