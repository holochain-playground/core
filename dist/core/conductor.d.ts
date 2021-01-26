import { AgentPubKey, CellId, Dictionary, Hash } from '@holochain-open-dev/core-types';
import { Cell } from '../core/cell';
import { Network, NetworkState } from './network/network';
import { SimulatedDna, SimulatedDnaTemplate } from '../dnas/simulated-dna';
import { CellState } from './cell/state';
import { Executor } from '../executor/executor';
import { BootstrapService } from '../bootstrap/bootstrap-service';
export interface ConductorState {
    cellsState: Dictionary<Dictionary<CellState>>;
    networkState: NetworkState;
    registeredTemplates: Dictionary<SimulatedDnaTemplate>;
    registeredDnas: Dictionary<SimulatedDna>;
}
export declare class Conductor {
    bootstrapService: BootstrapService;
    executor: Executor;
    readonly cells: Dictionary<Dictionary<Cell>>;
    registeredTemplates: Dictionary<SimulatedDnaTemplate>;
    registeredDnas: Dictionary<SimulatedDna>;
    network: Network;
    constructor(state: ConductorState, bootstrapService: BootstrapService, executor: Executor);
    static create(bootstrapService: BootstrapService, executor?: Executor): Promise<Conductor>;
    getState(): ConductorState;
    getAllCells(): Cell[];
    getCells(dnaHash: Hash): Cell[];
    getCell(dnaHash: Hash, agentPubKey: AgentPubKey): Cell;
    registerDna(dna_template: SimulatedDnaTemplate): Promise<Hash>;
    installApp(dna_hash: Hash, membrane_proof: any, properties: any, uuid: string): Promise<Cell>;
    callZomeFn(args: {
        cellId: CellId;
        zome: string;
        fnName: string;
        payload: any;
        cap: string;
    }): Promise<any>;
}
