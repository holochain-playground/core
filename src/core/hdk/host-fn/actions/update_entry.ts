import { Entry, Hash } from '@holochain-open-dev/core-types';
import { HostFn, HostFnWorkspace } from '../../host-fn';
import { common_update } from './common/update';

export type UpdateEntryFn = (args: {
  original_header_address: Hash;
  content: any;
  entry_def_id: string;
}) => Promise<Hash>;

// Creates a new Create header and its entry in the source chain
export const update_entry: HostFn<UpdateEntryFn> = (
  workspace: HostFnWorkspace,
  zome_index: number
): UpdateEntryFn => async (args: {
  original_header_address: Hash;
  content: any;
  entry_def_id: string;
}): Promise<Hash> => {
  const entry: Entry = { entry_type: 'App', content: args.content };

  const entryDefIndex = workspace.dna.zomes[zome_index].entry_defs.findIndex(
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
      visibility:
        workspace.dna.zomes[zome_index].entry_defs[entryDefIndex].visibility,
    },
  };

  return common_update(
    workspace,
    args.original_header_address,
    entry,
    entry_type
  );
};