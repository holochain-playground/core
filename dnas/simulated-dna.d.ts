import { Hash } from '@holochain-open-dev/core-types';
import { HdkAction } from '../core/cell/source-chain/actions';
export declare type SimulatedZome = {
    [fnName: string]: (payload: any) => Array<HdkAction>;
};
export declare type SimulatedDna = {
    hash: Hash;
    zomes: {
        [zome: string]: SimulatedZome;
    };
};
