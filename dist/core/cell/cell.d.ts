import { CellId, AgentPubKey, Hash, Dictionary, DHTOp } from '@holochain-open-dev/core-types';
import { Conductor } from '../conductor';
import { P2pCell } from '../network/p2p-cell';
import { CellState } from './state';
import { Workflow } from './workflows/workflows';
import { MiddlewareExecutor } from '../../executor/middleware-executor';
export declare type CellSignal = 'after-workflow-executed' | 'before-workflow-executed';
export declare type CellSignalListener = (payload: any) => void;
export declare class Cell {
    #private;
    state: CellState;
    conductor: Conductor;
    p2p: P2pCell;
    workflowExecutor: MiddlewareExecutor<Workflow>;
    constructor(state: CellState, conductor: Conductor, p2p: P2pCell);
    get cellId(): CellId;
    get agentPubKey(): AgentPubKey;
    get dnaHash(): Hash;
    getSimulatedDna(): import("../..").SimulatedDna;
    static create(conductor: Conductor, cellId: CellId, membrane_proof: any): Promise<Cell>;
    getState(): CellState;
    triggerWorkflow(workflow: Workflow): void;
    _runPendingWorkflows(): Promise<void>;
    _runWorkflow(workflow: Workflow): Promise<any>;
    /** Workflows */
    callZomeFn(args: {
        zome: string;
        fnName: string;
        payload: any;
        cap: string;
    }): Promise<any>;
    /** Network handlers */
    handle_new_neighbor(neighborPubKey: AgentPubKey): Promise<void>;
    handle_publish(from_agent: AgentPubKey, dht_hash: Hash, // The basis for the DHTOps
    ops: Dictionary<DHTOp>): Promise<void>;
}
