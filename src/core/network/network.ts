import {
  AgentPubKey,
  CellId,
  Dictionary,
  Hash,
} from '@holochain-open-dev/core-types';
import { Cell } from '../cell';
import { Conductor } from '../conductor';
import { P2pCell, P2pCellState } from '../network/p2p-cell';

export interface NetworkState {
  // P2pCellState by dna hash / agentPubKey
  p2pCellsState: Dictionary<Dictionary<P2pCellState>>;
}

export class Network {
  // P2pCells contained in this conductor
  p2pCells: Dictionary<Dictionary<P2pCell>>;

  constructor(state: NetworkState, public conductor: Conductor) {
    this.p2pCells = {};
    for (const [dnaHash, p2pState] of Object.entries(state.p2pCellsState)) {
      if (!this.p2pCells[dnaHash]) this.p2pCells[dnaHash];
      for (const [agentPubKey, p2pCellState] of Object.entries(p2pState)) {
        this.p2pCells[dnaHash][agentPubKey] = new P2pCell(
          p2pCellState,
          [dnaHash, agentPubKey],
          this
        );
      }
    }
  }

  getState(): NetworkState {
    const p2pCellsState: Dictionary<Dictionary<P2pCellState>> = {};

    for (const [dnaHash, dnaP2pCells] of Object.entries(this.p2pCells)) {
      if (!p2pCellsState[dnaHash]) p2pCellsState[dnaHash] = {};

      for (const [agentPubKey, p2pCell] of Object.entries(dnaP2pCells)) {
        p2pCellsState[dnaHash][agentPubKey] = p2pCell.getState();
      }
    }

    return {
      p2pCellsState,
    };
  }

  getAllP2pCells(): P2pCell[] {
    const nestedCells = Object.values(this.p2pCells).map(dnaCells =>
      Object.values(dnaCells)
    );
    return ([] as P2pCell[]).concat(...nestedCells);
  }

  createP2pCell(cellId: CellId): P2pCell {
    const dnaHash = cellId[0];

    const state: P2pCellState = {
      neighbors: [],
      redundancyFactor: 5,
    };

    const p2pCell = new P2pCell(state, cellId, this);

    if (!this.p2pCells[dnaHash]) this.p2pCells[dnaHash] = {};
    this.p2pCells[dnaHash][cellId[1]] = p2pCell;

    return p2pCell;
  }

  public sendRequest<T>(
    dna: Hash,
    fromAgent: Hash,
    toAgent: Hash,
    request: NetworkRequest<T>
  ): Promise<T> {
    const localCell =
      this.conductor.cells[dna] && this.conductor.cells[dna][toAgent];

    if (localCell) return request(localCell);

    return request(this.conductor.bootstrapService.cells[dna][toAgent]);
  }
}

export type NetworkRequest<T> = (cell: Cell) => Promise<T>;
