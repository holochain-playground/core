import { AgentPubKey, CellId, DHTOp, Dictionary, Hash } from '@holochain-open-dev/core-types';
import { Subject } from 'rxjs';
import { Cell } from '../cell';
import { Network } from './network';
export declare type P2pCellState = {
    peers: Hash[];
    redundancyFactor: number;
};
export declare type P2pCellSignals = 'before-network-request';
export declare class P2pCell {
    protected cellId: CellId;
    protected network: Network;
    peers: Hash[];
    redundancyFactor: number;
    signals: {
        'before-network-request': Subject<{
            fromAgent: AgentPubKey;
            toAgent: AgentPubKey;
        }>;
    };
    constructor(state: P2pCellState, cellId: CellId, network: Network);
    getState(): P2pCellState;
    join(containerCell: Cell): Promise<void>;
    leave(): Promise<void>;
    publish(dht_hash: Hash, ops: Dictionary<DHTOp>): Promise<void>;
    get(dna_hash: Hash, from_agent: AgentPubKey, dht_hash: Hash, _options: any): Promise<Element | undefined>;
    getNeighbors(): Array<AgentPubKey>;
    private _getClosestNeighbors;
    private _sendRequest;
}
