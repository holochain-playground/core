import { Element } from '@holochain-open-dev/core-types';
import { Cell } from '../../cell';
export declare type HdkAction = (zome_index: number, cell: Cell) => Promise<Element>;
export declare const create_entry: (content: any, entry_def_id: string) => HdkAction;
