import { AgentPubKeyB64, CellId, Element, Dictionary, DHTOp, SignedHeaderHashed, CapSecret, HeaderHashB64, DnaHashB64 } from '@holochain-open-dev/core-types';
import { CellState } from '../state';
export declare function getTipOfChain(cellState: CellState): HeaderHashB64;
export declare function getAuthor(cellState: CellState): AgentPubKeyB64;
export declare function getDnaHash(state: CellState): DnaHashB64;
export declare function getHeaderAt(cellState: CellState, index: number): SignedHeaderHashed;
export declare function getNextHeaderSeq(cellState: CellState): number;
export declare function getElement(state: CellState, headerHash: HeaderHashB64): Element;
export declare function getCellId(state: CellState): CellId;
export declare function getNonPublishedDhtOps(state: CellState): Dictionary<DHTOp>;
export declare function valid_cap_grant(state: CellState, zome: string, fnName: string, provenance: AgentPubKeyB64, secret: CapSecret | undefined): boolean;
