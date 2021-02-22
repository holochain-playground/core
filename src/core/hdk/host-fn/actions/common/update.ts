import {
  Hash,
  Element,
  NewEntryHeader,
  Entry,
  EntryType,
} from '@holochain-open-dev/core-types';
import { GetStrategy } from '../../../../../types';
import {
  buildDelete,
  buildShh,
  buildUpdate,
} from '../../../../cell/source-chain/builder-headers';
import { putElement } from '../../../../cell/source-chain/put';
import { HostFnWorkspace } from '../../../host-fn';

export async function common_update(
  worskpace: HostFnWorkspace,
  original_header_hash: Hash,
  entry: Entry,
  entry_type: EntryType
): Promise<Hash> {
  const elementToDelete = await worskpace.cascade.dht_get(
    original_header_hash,
    {
      strategy: GetStrategy.Contents,
    }
  );

  if (!elementToDelete) throw new Error('Could not find element to be deleted');

  const original_entry_hash = (elementToDelete.signed_header.header
    .content as NewEntryHeader).entry_hash;

  const deleteHeader = buildUpdate(
    worskpace.state,
    entry,
    entry_type,
    original_entry_hash,
    original_header_hash
  );

  const element: Element = {
    signed_header: buildShh(deleteHeader),
    entry: undefined,
  };
  putElement(element)(worskpace.state);

  return element.signed_header.header.hash;
}