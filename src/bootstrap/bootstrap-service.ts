import { AgentPubKey, Dictionary, Hash } from '@holochain-open-dev/core-types';
import { Cell } from '../core/cell';
import { Conductor } from '../core/conductor';
import { getClosestNeighbors } from '../core/network/utils';

export class BootstrapService {
  cells: Dictionary<Dictionary<Cell>> = {};

  announceCell(cell: Cell) {
    if (!this.cells[cell.dnaHash]) this.cells[cell.dnaHash] = {};
    this.cells[cell.dnaHash][cell.agentPubKey] = cell;
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
