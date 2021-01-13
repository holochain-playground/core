import { Entry, EntryType, Element } from '@holochain-open-dev/core-types';
import { CellState } from '../state';
export declare type HdkAction = (state: CellState) => Promise<Element>;
export declare const create: (entry: Entry, entry_type: EntryType) => HdkAction;
