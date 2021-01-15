import {
  Dictionary,
  EntryVisibility,
  Hash,
} from '@holochain-open-dev/core-types';

export interface SimulatedZomeFunctionContext {
  create_entry: (content: any, entry_def_id: string) => Promise<Hash>;
}

export type SimulatedZomeFunction = (
  context: SimulatedZomeFunctionContext
) => (payload: any) => Promise<any>;

export interface SimulatedZome {
  name: string;
  entry_defs: Array<EntryDef>;
  zome_functions: Dictionary<SimulatedZomeFunction>;
}

export type SimulatedDnaTemplate = {
  zomes: Array<SimulatedZome>;
};

export interface SimulatedDna {
  zomes: Array<SimulatedZome>;
  properties: any;
  uuid: string;
}

export interface EntryDef {
  id: string;
  visibility: EntryVisibility;
}
