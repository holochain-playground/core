import {
  AgentPubKey,
  CellId,
  DHTOp,
  Dictionary,
  Hash,
} from '@holochain-open-dev/core-types';
import { compareBigInts, distance } from '../../processors/hash';
import { Cell } from '../cell';
import { Network, NetworkMessage } from './network';
import { getClosestNeighbors } from './utils';

export type P2pCellState = {
  peers: Hash[];
  redundancyFactor: number;
};

// From: https://github.com/holochain/holochain/blob/develop/crates/holochain_p2p/src/types/actor.rs
export class P2pCell {
  peers: Hash[];

  redundancyFactor!: number;

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

    this.network.conductor.bootstrapService.announceCell(containerCell);

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

    const promises = neighbors.map(neighbor =>
      this._sendMessage(neighbor, cell =>
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

  private _sendMessage<T>(
    toAgent: AgentPubKey,
    message: NetworkMessage<T>
  ): Promise<T> {
    return this.network.sendMessage(
      this.cellId[0],
      this.cellId[1],
      toAgent,
      message
    );
  }
}
