import { Details, Element, ElementDetails, EntryDetails, Hash } from '@holochain-open-dev/core-types';
import { GetLinksOptions, GetOptions } from '../../../types';
import { P2pCell } from '../../network/p2p-cell';
import { CellState } from '../state';
import { Link } from './types';
export declare class Cascade {
    protected state: CellState;
    protected p2p: P2pCell;
    constructor(state: CellState, p2p: P2pCell);
    dht_get(hash: Hash, options: GetOptions): Promise<Element | undefined>;
    dht_get_details(hash: Hash, options: GetOptions): Promise<Details | undefined>;
    dht_get_links(base_address: Hash, options: GetLinksOptions): Promise<Link[]>;
    getEntryDetails(entryHash: Hash, options: GetOptions): Promise<EntryDetails | undefined>;
    getHeaderDetails(entryHash: Hash, options: GetOptions): Promise<ElementDetails | undefined>;
}