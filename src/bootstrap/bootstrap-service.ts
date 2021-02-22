import {
  AgentPubKey,
  CellId,
  Dictionary,
  Hash,
} from '@holochain-open-dev/core-types';
import { Cell } from '../core/cell';
import {
  getClosestNeighbors,
  getFarthestNeighbors,
} from '../core/network/utils';

export class BootstrapService {
  cells: Dictionary<Dictionary<Cell>> = {};

  announceCell(cellId: CellId, cell: Cell) {
    const dnaHash = cellId[0];
    const agentPubKey = cellId[1];
    if (!this.cells[dnaHash]) this.cells[dnaHash] = {};
    this.cells[dnaHash][agentPubKey] = cell;
  }

  getNeighborhood(
    dnaHash: Hash,
    basis_dht_hash: Hash,
    numNeighbors: number
  ): Cell[] {
    const cells = Object.keys(this.cells[dnaHash]);

    const neighborsKeys = getClosestNeighbors(
      cells,
      basis_dht_hash,
      numNeighbors
    );

    return neighborsKeys.map(pubKey => this.cells[dnaHash][pubKey]);
  }

  getDhtPeers(
    dnaHash: Hash,
    agentPubKey: string,
    numNeighbors: number,
    numFarthest: number
  ): Cell[] {
    const cells = Object.keys(this.cells[dnaHash]).filter(peerPubKey => peerPubKey !== agentPubKey);

    const neighborsKeys = getClosestNeighbors(cells, agentPubKey, numNeighbors);
    const farthestKeys = getFarthestNeighbors(cells, agentPubKey, numFarthest);

    return [...neighborsKeys, ...farthestKeys].map(
      pubKey => this.cells[dnaHash][pubKey]
    );
  }
}
