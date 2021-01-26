import { CellId, Dictionary, Hash } from '@holochain-open-dev/core-types';
import { Cell } from '../cell';
import { Conductor } from '../conductor';
import { P2pCell, P2pCellState } from '../network/p2p-cell';
export interface NetworkState {
    p2pCellsState: Dictionary<Dictionary<P2pCellState>>;
}
export declare class Network {
    conductor: Conductor;
    p2pCells: Dictionary<Dictionary<P2pCell>>;
    constructor(state: NetworkState, conductor: Conductor);
    getState(): NetworkState;
    getAllP2pCells(): P2pCell[];
    createP2pCell(cellId: CellId): P2pCell;
    sendRequest<T>(dna: Hash, fromAgent: Hash, toAgent: Hash, message: NetworkRequest<T>): Promise<T>;
}
export declare type NetworkRequest<T> = (cell: Cell) => Promise<T>;
