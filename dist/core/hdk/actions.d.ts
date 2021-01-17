import { Hash } from '@holochain-open-dev/core-types';
import { Cell } from '../cell';
export declare type HostFunction<Fn extends Function> = (zome_index: number, cell: Cell) => Fn;
export declare type CreateEntry = (args: {
    content: any;
    entry_def_id: string;
}) => Promise<Hash>;
export declare const create_entry: HostFunction<CreateEntry>;
