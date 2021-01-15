import { Hash } from '@holochain-open-dev/core-types';
import { Cell } from '../cell';
export declare type HostFunction<A, R> = (zome_index: number, cell: Cell) => (args: A) => Promise<R>;
export declare const create_entry: HostFunction<{
    content: any;
    entry_def_id: string;
}, Hash>;
