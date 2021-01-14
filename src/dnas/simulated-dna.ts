import {
  EntryVisibility,
} from '@holochain-open-dev/core-types';
import { HdkAction } from '../core/cell/source-chain/actions';

export type SimulatedZomeFunctions = {
  [fnName: string]: (payload: any) => Array<HdkAction>;
};

export interface SimulatedZome {
  name: string;
  entry_defs: Array<EntryDef>;
  zome_functions: SimulatedZomeFunctions;
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
