import {
  AgentPubKey,
  CellId,
  DHTOp,
  Dictionary,
  Hash,
} from '@holochain-open-dev/core-types';
import { Subject } from 'rxjs';
import { Cell } from '../cell';
import { Network, NetworkRequest } from './network';
import { getClosestNeighbors } from './utils';

export type P2pCellState = {
  peers: Hash[];
  redundancyFactor: number;
};

export type P2pCellSignals = 'before-network-request';

// From: https://github.com/holochain/holochain/blob/develop/crates/holochain_p2p/src/types/actor.rs
export class P2pCell {
  peers: Hash[];

  redundancyFactor!: number;

  signals = {
    'before-network-request': new Subject<{
      fromAgent: AgentPubKey;
      toAgent: AgentPubKey;
    }>(),
  };

  constructor(
    state: P2pCellState,
    protected cellId: CellId,
    protected network: Network
  ) {
    this.peers = state.peers;
  }

  getState(): P2pCellState {
    return {
      peers: this.peers,
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

    this.peers = neighbors.map(cell => cell.agentPubKey);
  }

  async leave(): Promise<void> {}

  async publish(dht_hash: Hash, ops: Dictionary<DHTOp>): Promise<void> {
    const neighbors = this._getClosestNeighbors(
      dht_hash,
      this.redundancyFactor
    );

    if (neighbors.length < this.redundancyFactor)
      throw new Error(`Couldn't publish dht ops: too few neighbors`);

    const promises = neighbors.map(neighbor =>
      this._sendRequest(neighbor, cell =>
        cell.handle_publish(this.cellId[1], dht_hash, ops)
      )
    );

    await Promise.all(promises);
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
    return this.peers;
  }

  private _getClosestNeighbors(
    basisHash: Hash,
    neighborCount: number
  ): Array<AgentPubKey> {
    return getClosestNeighbors(
      [...this.peers, this.cellId[1]],
      basisHash,
      neighborCount
    );
  }

  private _sendRequest<T>(
    toAgent: AgentPubKey,
    message: NetworkRequest<T>
  ): Promise<T> {
    this.signals['before-network-request'].next({
      fromAgent: this.cellId[0],
      toAgent: toAgent,
    });
    return this.network.sendRequest(
      this.cellId[0],
      this.cellId[1],
      toAgent,
      message
    );
  }
}
