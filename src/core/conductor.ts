import {
  CellId,
  AgentPubKey,
  DnaHash,
  CapSecret,
} from '@holochain/conductor-api';
import { Dictionary } from '@holochain-open-dev/core-types';

import { Cell, getCellId } from '../core/cell';
import { hash, HashType } from '../processors/hash';
import { CellMap, HoloHashMap } from '../processors/holo-hash-map';
import { Network, NetworkState } from './network/network';

import {
  hashDna,
  InstalledHapps,
  SimulatedDna,
  SimulatedHappBundle,
} from '../dnas/simulated-dna';
import { CellState } from './cell/state';
import { BootstrapService } from '../bootstrap/bootstrap-service';
import { BadAgent, BadAgentConfig } from './bad-agent';
import isEqual from 'lodash-es/isEqual';

export interface ConductorState {
  // DnaHash / AgentPubKey
  cellsState: CellMap<CellState>;
  networkState: NetworkState;
  registeredDnas: HoloHashMap<SimulatedDna>;
  installedHapps: Dictionary<InstalledHapps>;
  name: string;
  badAgent: BadAgent | undefined;
}

export class Conductor {
  readonly cells: CellMap<Cell>;
  registeredDnas!: HoloHashMap<SimulatedDna>;
  installedHapps!: Dictionary<InstalledHapps>;

  network: Network;
  name: string;

  badAgent: BadAgent | undefined; // If undefined, this is an honest agent

  constructor(state: ConductorState, bootstrapService: BootstrapService) {
    this.network = new Network(state.networkState, this, bootstrapService);
    this.registeredDnas = state.registeredDnas;
    this.installedHapps = state.installedHapps;
    this.name = state.name;

    this.cells = new CellMap();

    for (const [cellId, cellState] of state.cellsState.entries()) {
      this.cells.put(cellId, new Cell(cellState, this));
    }
  }

  static async create(
    bootstrapService: BootstrapService,
    name: string
  ): Promise<Conductor> {
    const state: ConductorState = {
      cellsState: new CellMap(),
      networkState: {
        p2pCellsState: new CellMap(),
      },
      registeredDnas: new HoloHashMap(),
      installedHapps: {},
      name,
      badAgent: undefined,
    };

    return new Conductor(state, bootstrapService);
  }

  getState(): ConductorState {
    const cellsState: CellMap<CellState> = new CellMap();

    for (const [cellId, cell] of this.cells.entries()) {
      cellsState.put(cellId, cell.getState());
    }

    return {
      name: this.name,
      networkState: this.network.getState(),
      cellsState,
      registeredDnas: this.registeredDnas,
      installedHapps: this.installedHapps,
      badAgent: this.badAgent,
    };
  }

  getAllCells(): Cell[] {
    return this.cells.values();
  }

  getCells(dnaHash: DnaHash): Cell[] {
    return this.cells.valuesForDna(dnaHash);
  }

  getCell(cellId: CellId): Cell | undefined {
    return this.cells.get(cellId);
  }

  /** Bad agents */

  setBadAgent(badAgentConfig: BadAgentConfig) {
    if (!this.badAgent)
      this.badAgent = {
        config: badAgentConfig,
        counterfeitDnas: new CellMap(),
      };
    this.badAgent.config = badAgentConfig;
  }

  setCounterfeitDna(cellId: CellId, dna: SimulatedDna) {
    if (!this.badAgent) throw new Error('This is not a bad agent');

    this.badAgent.counterfeitDnas.put(cellId, dna);
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
    if (!installedApp.roles[slotNick])
      throw new Error(`The slot nick doesn't exist for the given app id`);

    const slotToClone = installedApp.roles[slotNick];

    const hashOfDnaToClone = slotToClone.base_cell_id[0];
    const dnaToClone = this.registeredDnas.get(hashOfDnaToClone);

    if (!dnaToClone) {
      throw new Error(
        `The dna to be cloned is not registered on this conductor`
      );
    }

    const dna: SimulatedDna = { ...dnaToClone };

    if (uid) dna.uid = uid;
    if (properties) dna.properties = properties;

    const newDnaHash = hashDna(dna);

    if (isEqual(newDnaHash, hashOfDnaToClone))
      throw new Error(
        `Trying to clone a dna would create exactly the same DNA`
      );
    this.registeredDnas.put(newDnaHash, dna);

    const cell = await this.createCell(
      dna,
      installedApp.agent_pub_key,
      membraneProof
    );
    this.installedHapps[installedAppId].roles[slotNick].clones.push(
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

    this.installedHapps[happ.name] = {
      agent_pub_key: agentId,
      app_id: happ.name,
      roles: {},
    };

    for (const [cellNick, dnaSlot] of Object.entries(happ.slots)) {
      let dnaHash: DnaHash | undefined = undefined;
      if (ArrayBuffer.isView(dnaSlot.dna)) {
        dnaHash = dnaSlot.dna;
        if (!this.registeredDnas.get(dnaHash))
          throw new Error(
            `Trying to reference a Dna that this conductor doesn't have registered`
          );
      } else if (typeof dnaSlot.dna === 'object') {
        dnaHash = hashDna(dnaSlot.dna);
        this.registeredDnas.put(dnaHash, dnaSlot.dna);
      } else {
        throw new Error(
          'Bad DNA Slot: you must pass in the hash of the dna or the simulated Dna object'
        );
      }

      this.installedHapps[happ.name].roles[cellNick] = {
        base_cell_id: [dnaHash, agentId],
        is_provisioned: !dnaSlot.deferred,
        clones: [],
      };

      if (!dnaSlot.deferred) {
        const cell = await this.createCell(
          this.registeredDnas.get(dnaHash),
          agentId,
          membrane_proofs[cellNick]
        );
      }
    }
  }

  private async createCell(
    dna: SimulatedDna,
    agentPubKey: AgentPubKey,
    membraneProof?: any
  ): Promise<Cell> {
    const newDnaHash = hashDna(dna);

    const cellId: CellId = [newDnaHash, agentPubKey];
    const cell = await Cell.create(this, cellId, membraneProof);

    this.cells.put(cellId, cell);

    return cell;
  }

  /** App API */

  callZomeFn(args: {
    cellId: CellId;
    zome: string;
    fnName: string;
    payload: any;
    cap: CapSecret;
  }): Promise<any> {
    const dnaHash = args.cellId[0];
    const agentPubKey = args.cellId[1];
    const cell = this.cells.get(args.cellId);

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
