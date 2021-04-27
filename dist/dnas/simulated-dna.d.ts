import { AgentPubKey, CellId, Dictionary, EntryVisibility } from '@holochain-open-dev/core-types';
import { ValidationOutcome } from '../core/cell/sys_validate/types';
import { SimulatedValidateFunctionContext, SimulatedZomeFunctionContext } from '../core/hdk';
export interface SimulatedZomeFunctionArgument {
    name: string;
    type: string;
}
export interface SimulatedZomeFunction {
    call: (context: SimulatedZomeFunctionContext) => (payload: any) => Promise<any>;
    arguments: SimulatedZomeFunctionArgument[];
}
export declare type SimulatedValidateFunction = (context: SimulatedValidateFunctionContext) => (payload: any) => Promise<ValidationOutcome>;
export interface SimulatedZome {
    name: string;
    entry_defs: Array<EntryDef>;
    zome_functions: Dictionary<SimulatedZomeFunction>;
    validation_functions: Dictionary<SimulatedValidateFunction>;
    blocklyCode?: string;
}
export interface SimulatedDna {
    zomes: Array<SimulatedZome>;
    properties: Dictionary<any>;
    uid: string;
}
export interface SimulatedDnaSlot {
    dna: SimulatedDna;
    deferred: boolean;
}
export interface AppSlot {
    base_cell_id: CellId;
    is_provisioned: boolean;
    clones: CellId[];
}
export interface InstalledHapps {
    app_id: string;
    agent_pub_key: AgentPubKey;
    slots: Dictionary<AppSlot>;
}
export interface SimulatedHappBundle {
    name: string;
    description: string;
    slots: Dictionary<SimulatedDnaSlot>;
}
export interface EntryDef {
    id: string;
    visibility: EntryVisibility;
}
