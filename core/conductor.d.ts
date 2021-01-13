import { CellId, Hash } from '@holochain-open-dev/core-types';
import { Cell } from '../core/cell';
import { Network, NetworkState } from './network';
import { SimulatedDna } from '../dnas/simulated-dna';
import { CellState } from './cell/state';
export interface ConductorState {
    cellsState: Array<{
        id: CellId;
        state: CellState;
        dna?: SimulatedDna;
    }>;
    networkState: NetworkState;
}
export declare class Conductor {
    readonly cells: Array<{
        id: CellId;
        cell: Cell;
    }>;
    network: Network;
    constructor(state: ConductorState);
    static create(): Promise<Conductor>;
    getState(): ConductorState;
    getCells(dnaHash: Hash): Cell[];
    installDna(dna: SimulatedDna, membrane_proof: any): Promise<Cell>;
    callZomeFn(args: {
        cellId: CellId;
        zome: string;
        fnName: string;
        payload: any;
        cap: string;
    }): Promise<any>;
}
