import {
  Dictionary,
  EntryVisibility,
  Hash,
} from '@holochain-open-dev/core-types';
import { CreateEntry } from '../core/hdk/actions';

export interface SimulatedZomeFunctionContext {
  create_entry: CreateEntry;
}

export interface SimulatedZomeFunctionArgument {
  name: string;
  type: string;
}

export interface SimulatedZomeFunction {
  call: (
    context: SimulatedZomeFunctionContext
  ) => (payload: any) => Promise<any>;
  arguments: SimulatedZomeFunctionArgument[];
}

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
