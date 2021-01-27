import {
  AgentPubKey,
  CellId,
  DHTOp,
  Dictionary,
  Hash,
} from '@holochain-open-dev/core-types';
import { Subject } from 'rxjs';
import { DelayExecutor } from '../../executor/delay-executor';
import { Cell } from '../cell';
import { Network, NetworkRequest } from './network';
import { getClosestNeighbors } from './utils';

export type P2pCellState = {
  neighbors: Hash[];
  redundancyFactor: number;
};

export type P2pCellSignals = 'before-network-request';
export interface NetworkRequestInfo {
  duration: number;
  dnaHash: Hash;
  fromAgent: AgentPubKey;
  toAgent: AgentPubKey;
  name: string;
}

// From: https://github.com/holochain/holochain/blob/develop/crates/holochain_p2p/src/types/actor.rs
export class P2pCell {
  neighbors: Hash[];

  redundancyFactor!: number;

  signals = {
    'before-network-request': new Subject<NetworkRequestInfo>(),
  };

  constructor(
    state: P2pCellState,
    protected cellId: CellId,
    protected network: Network
  ) {
    this.neighbors = state.neighbors;
  }

  getState(): P2pCellState {
    return {
      neighbors: this.neighbors,
      redundancyFactor: this.redundancyFactor,
    };
  }

  async join(containerCell: Cell): Promise<void> {
    const dnaHash = this.cellId[0];
    const agentPubKey = this.cellId[1];

    this.network.conductor.bootstrapService.announceCell(
      this.cellId,
      containerCell
    );

    const neighbors = this.network.conductor.bootstrapService.getNeighbors(
      dnaHash,
      agentPubKey,
      this.redundancyFactor
    );

    this.neighbors = neighbors.map(cell => cell.agentPubKey);

    const promises = this.neighbors.map(neighbor =>
      this._sendRequest(neighbor, 'Add Neighbor', cell =>
        cell.handle_new_neighbor(agentPubKey)
      )
    );
    await Promise.all(promises);
  }

  async leave(): Promise<void> {}

  async publish(dht_hash: Hash, ops: Dictionary<DHTOp>): Promise<void> {
    const neighbors = this._getClosestNeighbors(
      dht_hash,
      this.redundancyFactor
    );

    const promises = neighbors.map(neighbor =>
      this._sendRequest(neighbor, 'Publish Request', cell =>
        cell.handle_publish(this.cellId[1], dht_hash, ops)
      )
    );

    await Promise.all(promises);
  }

  async addNeighbor(neighborPubKey: AgentPubKey) {
    if (!this.neighbors.includes(neighborPubKey))
      this.neighbors.push(neighborPubKey);
  }

  async get(
    dna_hash: Hash,
    from_agent: AgentPubKey,
    dht_hash: Hash,
    _options: any // TODO: complete?
  ): Promise<Element | undefined> {
    return undefined;
  }

  public getNeighbors(): Array<AgentPubKey> {
    return this.neighbors;
  }

  private _getClosestNeighbors(
    basisHash: Hash,
    neighborCount: number
  ): Array<AgentPubKey> {
    return getClosestNeighbors(
      [...this.neighbors, this.cellId[1]],
      basisHash,
      neighborCount
    );
  }

  private _sendRequest<T>(
    toAgent: AgentPubKey,
    name: string,
    message: NetworkRequest<T>
  ): Promise<T> {
    const duration =
      (this.network.conductor.executor as DelayExecutor).delayMillis || 0;
    this.signals['before-network-request'].next({
      fromAgent: this.cellId[1],
      toAgent: toAgent,
      duration,
      dnaHash: this.cellId[0],
      name,
    });
    return this.network.sendRequest(
      this.cellId[0],
      this.cellId[1],
      toAgent,
      message
    );
  }
}
