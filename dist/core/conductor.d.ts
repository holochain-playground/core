import { AgentPubKey, CellId, Dictionary, Hash } from '@holochain-open-dev/core-types';
import { Cell } from '../core/cell';
import { Network, NetworkState } from './network/network';
import { InstalledHapps, SimulatedDna, SimulatedHappBundle } from '../dnas/simulated-dna';
import { CellState } from './cell/state';
import { BootstrapService } from '../bootstrap/bootstrap-service';
export interface ConductorState {
    cellsState: Dictionary<Dictionary<CellState>>;
    networkState: NetworkState;
    registeredDnas: Dictionary<SimulatedDna>;
    installedHapps: Dictionary<InstalledHapps>;
    name: string;
}
export declare class Conductor {
    readonly cells: Dictionary<Dictionary<Cell>>;
    registeredDnas: Dictionary<SimulatedDna>;
    installedHapps: Dictionary<InstalledHapps>;
    network: Network;
    name: string;
    constructor(state: ConductorState, bootstrapService: BootstrapService);
    static create(bootstrapService: BootstrapService, name: string): Promise<Conductor>;
    getState(): ConductorState;
    getAllCells(): Cell[];
    getCells(dnaHash: Hash): Cell[];
    getCell(dnaHash: Hash, agentPubKey: AgentPubKey): Cell | undefined;
    /** Admin API */
    cloneCell(installedAppId: string, slotNick: string, uid?: string, properties?: Dictionary<any>, membraneProof?: any): Promise<Cell>;
    installHapp(happ: SimulatedHappBundle, membrane_proofs: Dictionary<any>): Promise<void>;
    private createCell;
    /** App API */
    callZomeFn(args: {
        cellId: CellId;
        zome: string;
        fnName: string;
        payload: any;
        cap: string;
    }): Promise<any>;
}
