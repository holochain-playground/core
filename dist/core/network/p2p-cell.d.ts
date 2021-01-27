import { AgentPubKey, CellId, DHTOp, Dictionary, Hash } from '@holochain-open-dev/core-types';
import { Subject } from 'rxjs';
import { Cell } from '../cell';
import { Network } from './network';
export declare type P2pCellState = {
    neighbors: Hash[];
    redundancyFactor: number;
};
export declare type P2pCellSignals = 'before-network-request';
export interface NetworkRequestInfo {
    duration: number;
    dnaHash: Hash;
    fromAgent: AgentPubKey;
    toAgent: AgentPubKey;
    name: string;
}
export declare class P2pCell {
    protected cellId: CellId;
    protected network: Network;
    neighbors: Hash[];
    redundancyFactor: number;
    signals: {
        'before-network-request': Subject<NetworkRequestInfo>;
    };
    constructor(state: P2pCellState, cellId: CellId, network: Network);
    getState(): P2pCellState;
    join(containerCell: Cell): Promise<void>;
    leave(): Promise<void>;
    publish(dht_hash: Hash, ops: Dictionary<DHTOp>): Promise<void>;
    addNeighbor(neighborPubKey: AgentPubKey): Promise<void>;
    get(dna_hash: Hash, from_agent: AgentPubKey, dht_hash: Hash, _options: any): Promise<Element | undefined>;
    getNeighbors(): Array<AgentPubKey>;
    private _getClosestNeighbors;
    private _sendRequest;
}
