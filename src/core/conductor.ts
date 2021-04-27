import {
  AgentPubKey,
  CellId,
  Dictionary,
  Hash,
} from '@holochain-open-dev/core-types';
import { Cell, getCellId } from '../core/cell';
import { hash, HashType } from '../processors/hash';
import { Network, NetworkState } from './network/network';

import {
  InstalledHapps,
  SimulatedDna,
  SimulatedHappBundle,
} from '../dnas/simulated-dna';
import { CellState } from './cell/state';
import { BootstrapService } from '../bootstrap/bootstrap-service';

export interface ConductorState {
  // DnaHash / AgentPubKey
  cellsState: Dictionary<Dictionary<CellState>>;
  networkState: NetworkState;
  registeredDnas: Dictionary<SimulatedDna>;
  installedHapps: Dictionary<InstalledHapps>;
  name: string;
}

export class Conductor {
  readonly cells: Dictionary<Dictionary<Cell>>;
  registeredDnas!: Dictionary<SimulatedDna>;
  installedHapps!: Dictionary<InstalledHapps>;

  network: Network;
  name: string;

  constructor(state: ConductorState, bootstrapService: BootstrapService) {
    this.network = new Network(state.networkState, this, bootstrapService);
    this.registeredDnas = state.registeredDnas;
    this.installedHapps = state.installedHapps;
    this.name = state.name;

    this.cells = {};
    for (const [dnaHash, dnaCellsStates] of Object.entries(state.cellsState)) {
      if (!this.cells[dnaHash]) this.cells[dnaHash] = {};

      for (const [agentPubKey, cellState] of Object.entries(dnaCellsStates)) {
        this.cells[dnaHash][agentPubKey] = new Cell(
          cellState,
          this,
          this.network.createP2pCell(getCellId(cellState))
        );
      }
    }
  }

  static async create(
    bootstrapService: BootstrapService,
    name: string
  ): Promise<Conductor> {
    const state: ConductorState = {
      cellsState: {},
      networkState: {
        p2pCellsState: {},
      },
      registeredDnas: {},
      installedHapps: {},
      name,
    };

    return new Conductor(state, bootstrapService);
  }

  getState(): ConductorState {
    const cellsState: Dictionary<Dictionary<CellState>> = {};

    for (const [dnaHash, dnaCells] of Object.entries(this.cells)) {
      if (!cellsState[dnaHash]) cellsState[dnaHash];

      for (const [agentPubKey, cell] of Object.entries(dnaCells)) {
        cellsState[dnaHash][agentPubKey] = cell.getState();
      }
    }

    return {
      name: this.name,
      networkState: this.network.getState(),
      cellsState,
      registeredDnas: this.registeredDnas,
      installedHapps: this.installedHapps,
    };
  }

  getAllCells(): Cell[] {
    const nestedCells = Object.values(this.cells).map(dnaCells =>
      Object.values(dnaCells)
    );

    return ([] as Cell[]).concat(...nestedCells);
  }

  getCells(dnaHash: Hash): Cell[] {
    const dnaCells = this.cells[dnaHash];
    return dnaCells ? Object.values(dnaCells) : [];
  }

  getCell(dnaHash: Hash, agentPubKey: AgentPubKey): Cell | undefined {
    return this.cells[dnaHash] ? this.cells[dnaHash][agentPubKey] : undefined;
  }

  /** Admin API */
  /* 
  async registerDna(dna_template: SimulatedDna): Promise<Hash> {
    const templateHash = hash(dna_template, HashType.DNA);

    this.registeredDnas[templateHash] = dna_template;
    return templateHash;
  } */

  async cloneCell(
    installedAppId: string,
    slotNick: string,
    uid?: string,
    properties?: Dictionary<any>,
    membraneProof?: any
  ): Promise<Cell> {
    if (!this.installedHapps[installedAppId])
      throw new Error(`Given app id doesn't exist`);

    const installedApp = this.installedHapps[installedAppId];
    if (!installedApp.slots[slotNick])
      throw new Error(`The slot nick doesn't exist for the given app id`);

    const slotToClone = installedApp.slots[slotNick];

    const hashOfDnaToClone = slotToClone.base_cell_id[0];
    const dnaToClone = this.registeredDnas[hashOfDnaToClone];

    if (!dnaToClone) {
      throw new Error(
        `The dna to be cloned is not registered on this conductor`
      );
    }

    const dna: SimulatedDna = dnaToClone;

    if (uid) dna.uid = uid;
    if (properties) dna.properties = properties;

    const newDnaHash = hash(dna, HashType.DNA);

    if (newDnaHash === hashOfDnaToClone)
      throw new Error(
        `Trying to clone a dna would create exactly the same DNA`
      );

    const cell = await this.createCell(
      dna,
      installedApp.agent_pub_key,
      membraneProof
    );
    this.installedHapps[installedAppId].slots[slotNick].clones.push(
      cell.cellId
    );

    return cell;
  }

  async installHapp(
    happ: SimulatedHappBundle,
    membrane_proofs: Dictionary<any> // segmented by CellNick
  ): Promise<void> {
    const rand = `${Math.random().toString()}/${Date.now()}`;
    const agentId = hash(rand, HashType.AGENT);

    for (const [cellNick, dnaSlot] of Object.entries(happ.slots)) {
      const dnaHash = hash(dnaSlot.dna, HashType.DNA);
      this.registeredDnas[dnaHash] = dnaSlot.dna;

      if (!dnaSlot.deferred) {
        this.createCell(dnaSlot.dna, agentId, membrane_proofs[cellNick]);
      }
    }
  }

  private async createCell(
    dna: SimulatedDna,
    agentPubKey: string,
    membraneProof?: any
  ): Promise<Cell> {
    const newDnaHash = hash(dna, HashType.DNA);

    const cellId: CellId = [newDnaHash, agentPubKey];
    const cell = await Cell.create(this, cellId, membraneProof);

    if (!this.cells[cell.dnaHash]) this.cells[cell.dnaHash] = {};

    this.cells[cell.dnaHash][cell.agentPubKey] = cell;

    return cell;
  }

  /** App API */

  callZomeFn(args: {
    cellId: CellId;
    zome: string;
    fnName: string;
    payload: any;
    cap: string;
  }): Promise<any> {
    const dnaHash = args.cellId[0];
    const agentPubKey = args.cellId[1];
    const cell = this.cells[dnaHash][agentPubKey];

    if (!cell)
      throw new Error(`No cells existst with cellId ${dnaHash}:${agentPubKey}`);

    return cell.callZomeFn({
      zome: args.zome,
      cap: args.cap,
      fnName: args.fnName,
      payload: args.payload,
      provenance: agentPubKey,
    });
  }
}
