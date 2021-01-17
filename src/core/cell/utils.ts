import {
  AgentPubKey,
  AppEntryType,
  CellId,
  DHTOp,
  DHTOpType,
  Entry,
  EntryType,
  Hash,
} from '@holochain-open-dev/core-types';
import { hash } from '../../processors/hash';

export function hashEntry(entry: Entry): Hash {
  if (entry.entry_type === 'Agent') return entry.content;
  return hash(entry);
}

export function getAppEntryType(
  entryType: EntryType
): AppEntryType | undefined {
  if ((entryType as { App: AppEntryType }).App)
    return (entryType as { App: AppEntryType }).App;
  return undefined;
}

export function getEntryTypeString(entryType: EntryType): string {
  const appEntryType = getAppEntryType(entryType);
  // TODO: FIX
  if (appEntryType) return appEntryType.id.toString();

  return entryType as string;
}

export function getDHTOpBasis(dhtOp: DHTOp): Hash {
  switch (dhtOp.type) {
    case DHTOpType.StoreElement:
      return hash(dhtOp.header);
    case DHTOpType.StoreEntry:
      return dhtOp.header.header.content.entry_hash;
    case DHTOpType.RegisterUpdatedContent:
      return dhtOp.header.header.content.original_entry_address;
    case DHTOpType.RegisterAgentActivity:
      return dhtOp.header.header.content.author;
    case DHTOpType.RegisterAddLink:
      return dhtOp.header.header.content.base_address;
    case DHTOpType.RegisterRemoveLink:
      return dhtOp.header.header.content.base_address;
    case DHTOpType.RegisterDeletedBy:
      return dhtOp.header.header.content.deletes_address;
    case DHTOpType.RegisterDeletedEntryHeader:
      return dhtOp.header.header.content.deletes_entry_address;
    default:
      return (undefined as unknown) as Hash;
  }
}
