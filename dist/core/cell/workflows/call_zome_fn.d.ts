import { Cell } from '../../cell';
import { Workflow } from './workflows';
/**
 * Calls the zome function of the cell DNA
 * This can only be called in the simulated mode: we can assume that cell.simulatedDna exists
 */
export declare const callZomeFn: (zomeName: string, fnName: string, payload: any, cap: string) => (cell: Cell) => Promise<any>;
export declare type CallZomeFnWorkflow = Workflow<{
    zome: string;
    fnName: string;
    payload: any;
}, any>;
export declare const CALL_ZOME_WORKFLOW = "Call Zome Function";
export declare function call_zome_fn_workflow(cell: Cell, zome: string, fnName: string, payload: any): CallZomeFnWorkflow;
