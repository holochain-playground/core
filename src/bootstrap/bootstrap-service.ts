import {
  AgentPubKey,
  CellId,
  Dictionary,
  Hash,
} from '@holochain-open-dev/core-types';
import { Cell } from '../core/cell';
import { getClosestNeighbors } from '../core/network/utils';

export class BootstrapService {
  cells: Dictionary<Dictionary<Cell>> = {};

  announceCell(cellId: CellId, cell: Cell) {
    const dnaHash = cellId[0];
    const agentPubKey = cellId[1];
    if (!this.cells[dnaHash]) this.cells[dnaHash] = {};
    this.cells[dnaHash][agentPubKey] = cell;
  }

  getNeighbors(
    dnaHash: Hash,
    agentPubKey: AgentPubKey,
    numNeighbors: number
  ): Cell[] {
    const cells = Object.keys(this.cells[dnaHash]).filter(
      cellPubKey => cellPubKey !== agentPubKey
    );

    const neighborsKeys = getClosestNeighbors(cells, agentPubKey, numNeighbors);

    return neighborsKeys.map(pubKey => this.cells[dnaHash][pubKey]);
  }
}
