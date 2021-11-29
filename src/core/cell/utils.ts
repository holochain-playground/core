import {
  Create,
  CreateLink,
  Delete,
  DeleteLink,
  HeaderType,
  SignedHeaderHashed,
  Update,
  AnyDhtHash,
  AppEntryType,
  DhtOp,
  DhtOpType,
  Entry,
  EntryHash,
  EntryType,
} from '@holochain/conductor-api';
import { Element } from '@holochain-open-dev/core-types';

import { hash, HashType } from '../../processors/hash';
import { SimulatedDna } from '../../dnas/simulated-dna';

export function hashEntry(entry: Entry): EntryHash {
  if (entry.entry_type === 'Agent') return entry.content;
  return hash(entry.content, HashType.ENTRY);
}

export function getAppEntryType(
  entryType: EntryType
): AppEntryType | undefined {
  if ((entryType as { App: AppEntryType }).App)
    return (entryType as { App: AppEntryType }).App;
  return undefined;
}

export function getEntryTypeString(
  dna: SimulatedDna,
  entryType: EntryType
): string {
  const appEntryType = getAppEntryType(entryType);

  if (appEntryType) {
    return dna.zomes[appEntryType.zome_id].entry_defs[appEntryType.id].id;
  }

  return entryType as string;
}

export function getDhtOpBasis(dhtOp: DhtOp): AnyDhtHash {
  switch (dhtOp.type) {
    case DhtOpType.StoreElement:
      return dhtOp.header.header.hash;
    case DhtOpType.StoreEntry:
      return dhtOp.header.header.content.entry_hash;
    case DhtOpType.RegisterUpdatedContent:
      return dhtOp.header.header.content.original_entry_address;
    case DhtOpType.RegisterUpdatedElement:
      return dhtOp.header.header.content.original_header_address;
    case DhtOpType.RegisterAgentActivity:
      return dhtOp.header.header.content.author;
    case DhtOpType.RegisterAddLink:
      return dhtOp.header.header.content.base_address;
    case DhtOpType.RegisterRemoveLink:
      return dhtOp.header.header.content.base_address;
    case DhtOpType.RegisterDeletedBy:
      return dhtOp.header.header.content.deletes_address;
    case DhtOpType.RegisterDeletedEntryHeader:
      return dhtOp.header.header.content.deletes_entry_address;
    default:
      return undefined as unknown as AnyDhtHash;
  }
}

export const DHT_SORT_PRIORITY = [
  DhtOpType.RegisterAgentActivity,
  DhtOpType.StoreEntry,
  DhtOpType.StoreElement,
  DhtOpType.RegisterUpdatedContent,
  DhtOpType.RegisterUpdatedElement,
  DhtOpType.RegisterDeletedEntryHeader,
  DhtOpType.RegisterDeletedBy,
  DhtOpType.RegisterAddLink,
  DhtOpType.RegisterRemoveLink,
];

export function elementToDhtOps(element: Element): DhtOp[] {
  const allDhtOps: DhtOp[] = [];

  // All hdk commands have these two DHT Ops

  allDhtOps.push({
    type: DhtOpType.RegisterAgentActivity,
    header: element.signed_header,
  });
  allDhtOps.push({
    type: DhtOpType.StoreElement,
    header: element.signed_header,
    maybe_entry: element.entry,
  });

  // Each header derives into different DhtOps

  if (element.signed_header.header.content.type == HeaderType.Update) {
    allDhtOps.push({
      type: DhtOpType.RegisterUpdatedContent,
      header: element.signed_header as SignedHeaderHashed<Update>,
    });
    allDhtOps.push({
      type: DhtOpType.RegisterUpdatedElement,
      header: element.signed_header as SignedHeaderHashed<Update>,
    });
    allDhtOps.push({
      type: DhtOpType.StoreEntry,
      header: element.signed_header as SignedHeaderHashed<Update>,
      entry: element.entry as Entry,
    });
  } else if (element.signed_header.header.content.type == HeaderType.Create) {
    allDhtOps.push({
      type: DhtOpType.StoreEntry,
      header: element.signed_header as SignedHeaderHashed<Create>,
      entry: element.entry as Entry,
    });
  } else if (element.signed_header.header.content.type == HeaderType.Delete) {
    allDhtOps.push({
      type: DhtOpType.RegisterDeletedBy,
      header: element.signed_header as SignedHeaderHashed<Delete>,
    });
    allDhtOps.push({
      type: DhtOpType.RegisterDeletedEntryHeader,
      header: element.signed_header as SignedHeaderHashed<Delete>,
    });
  } else if (
    element.signed_header.header.content.type == HeaderType.DeleteLink
  ) {
    allDhtOps.push({
      type: DhtOpType.RegisterRemoveLink,
      header: element.signed_header as SignedHeaderHashed<DeleteLink>,
    });
  } else if (
    element.signed_header.header.content.type == HeaderType.CreateLink
  ) {
    allDhtOps.push({
      type: DhtOpType.RegisterAddLink,
      header: element.signed_header as SignedHeaderHashed<CreateLink>,
    });
  }

  return allDhtOps;
}

export function sortDhtOps(DhtOps: DhtOp[]): DhtOp[] {
  const prio = (DhtOp: DhtOp) =>
    DHT_SORT_PRIORITY.findIndex(type => type === DhtOp.type);
  return DhtOps.sort((dhtA: DhtOp, dhtB: DhtOp) => prio(dhtA) - prio(dhtB));
}

export function getEntry(DhtOp: DhtOp): Entry | undefined {
  if (DhtOp.type === DhtOpType.StoreEntry) return DhtOp.entry;
  else if (DhtOp.type === DhtOpType.StoreElement) return DhtOp.maybe_entry;
  return undefined;
}
