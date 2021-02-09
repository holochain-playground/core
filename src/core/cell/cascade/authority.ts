import {
  Create,
  Delete,
  Element,
  Entry,
  EntryType,
  Hash,
  NewEntryHeader,
  SignedHeaderHashed,
  Update,
} from '@holochain-open-dev/core-types';
import { GetOptions } from '../../../types';
import { Cell } from '../cell';
import { getHeaderModifiers, getHeadersForEntry } from '../dht/get';
import { ValidationStatus } from '../state';
import { GetEntryFull, GetElementFull } from './types';


// From https://github.com/holochain/holochain/blob/develop/crates/holochain_cascade/src/authority.rs
export class Authority {
  constructor(protected cell: Cell) {}

  public async handle_get_entry(
    entry_hash: Hash,
    options: GetOptions
  ): Promise<GetEntryFull | undefined> {
    const entry = this.cell.state.CAS[entry_hash];
    if (!entry) return undefined;

    const allHeaders = getHeadersForEntry(this.cell.state, entry_hash);

    let entry_type: EntryType | undefined = undefined;
    const live_headers: SignedHeaderHashed<Create>[] = [];
    const updates: SignedHeaderHashed<Update>[] = [];
    const deletes: SignedHeaderHashed<Delete>[] = [];

    for (const header of allHeaders) {
      const headerContent = (header as SignedHeaderHashed).header.content;

      if (
        (headerContent as Update).original_entry_address &&
        (headerContent as Update).original_entry_address === entry_hash
      ) {
        updates.push(header as SignedHeaderHashed<Update>);
      } else if (
        (headerContent as Create).entry_hash &&
        (headerContent as Create).entry_hash === entry_hash
      ) {
        live_headers.push(header as SignedHeaderHashed<Create>);
        if (!entry_type) {
          entry_type = (headerContent as Create).entry_type;
        }
      } else if (
        (headerContent as Delete).deletes_entry_address === entry_hash
      ) {
        deletes.push(header as SignedHeaderHashed<Delete>);
      }
    }

    return {
      entry,
      entry_type: entry_type as EntryType,
      live_headers,
      updates,
      deletes,
    };
  }

  public async handle_get_element(
    header_hash: Hash,
    options: GetOptions
  ): Promise<GetElementFull | undefined> {
    if (this.cell.state.metadata.misc_meta[header_hash] !== 'StoreElement') {
      return undefined;
    }

    const header = this.cell.state.CAS[header_hash] as SignedHeaderHashed;
    let maybe_entry: Entry | undefined = undefined;
    let validation_status: ValidationStatus = ValidationStatus.Valid;

    if (header) {
      if (
        (header as SignedHeaderHashed<NewEntryHeader>).header.content.entry_hash
      ) {
        const entryHash = (header as SignedHeaderHashed<NewEntryHeader>).header
          .content.entry_hash;
        maybe_entry = this.cell.state.CAS[entryHash];
      }
    } else {
      validation_status = ValidationStatus.Rejected;
    }

    const modifiers = getHeaderModifiers(this.cell.state, header_hash);

    return {
      deletes: modifiers.deletes,
      updates: modifiers.updates,
      signed_header: header,
      validation_status,
      maybe_entry,
    };
  }
}