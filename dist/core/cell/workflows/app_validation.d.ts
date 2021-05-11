import { Workflow, WorkflowReturn, Workspace } from './workflows';
import { SimulatedDna, SimulatedZome } from '../../../dnas/simulated-dna';
import { AgentPubKey, CreateLink, DeleteLink, DHTOp, Element, Entry } from '@holochain-open-dev/core-types';
import { ValidationOutcome } from '../sys_validate/types';
export declare const app_validation: (workspace: Workspace) => Promise<WorkflowReturn<void>>;
export declare type AppValidationWorkflow = Workflow<any, any>;
export declare function app_validation_task(agent?: boolean): AppValidationWorkflow;
export declare function validate_op(op: DHTOp, from_agent: AgentPubKey | undefined, workspace: Workspace): Promise<ValidationOutcome>;
export declare function run_validation_callback_direct(zome: SimulatedZome, dna: SimulatedDna, element: Element, workspace: Workspace): Promise<ValidationOutcome>;
export declare function run_agent_validation_callback(workspace: Workspace, elements: Element[]): Promise<ValidationOutcome>;
export declare function run_create_link_validation_callback(zome: SimulatedZome, link_add: CreateLink, base: Entry, target: Entry, workspace: Workspace): Promise<ValidationOutcome>;
export declare function run_delete_link_validation_callback(zome: SimulatedZome, delete_link: DeleteLink, workspace: Workspace): Promise<ValidationOutcome>;
