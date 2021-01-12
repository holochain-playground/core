import { Hash } from '@holochain-open-dev/core-types';
import { HdkAction } from '../core/cell/source-chain/actions';

export type SimulatedZome = {
  [fnName: string]: (payload: any) => Array<HdkAction>;
};

export type SimulatedDna = {
  hash: Hash;
  zomes: { [zome: string]: SimulatedZome };
};
