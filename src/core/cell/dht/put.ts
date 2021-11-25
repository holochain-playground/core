import { isEqual } from 'lodash-es';
import {
  ValidationReceipt,
  EntryDhtStatus,
  DhtOpHash,
} from '@holochain-open-dev/core-types';
import {
  DhtOp,
  DhtOpType,
  HeaderType,
  SignedHeaderHashed,
  NewEntryHeader,
  HeaderHash,
  EntryHash,
  AnyDhtHash,
} from '@holochain/conductor-api';
import {
  ChainStatus,
  LinkMetaKey,
  LinkMetaVal,
  SysMetaVal,
} from '../state/metadata';

import {
  ValidationLimboValue,
  CellState,
  IntegrationLimboValue,
  IntegratedDhtOpsValue,
} from '../state';

import { getHeadersForEntry } from './get';
import { HoloHashMap } from '../../../processors/holo-hash-map';
import { getEntry } from '../utils';

export const putValidationLimboValue =
  (dhtOpHash: DhtOpHash, validationLimboValue: ValidationLimboValue) =>
  (state: CellState) => {
    state.validationLimbo.put(dhtOpHash, validationLimboValue);
  };

export const putValidationReceipt =
  (dhtOpHash: DhtOpHash, validationReceipt: ValidationReceipt) =>
  (state: CellState) => {
    if (!state.validationReceipts.has(dhtOpHash)) {
      state.validationReceipts.put(dhtOpHash, new HoloHashMap());
    }

    state.validationReceipts
      .get(dhtOpHash)
      .put(validationReceipt.validator, validationReceipt);
  };

export const deleteValidationLimboValue =
  (dhtOpHash: DhtOpHash) => (state: CellState) => {
    state.validationLimbo.delete(dhtOpHash);
  };

export const putIntegrationLimboValue =
  (dhtOpHash: DhtOpHash, integrationLimboValue: IntegrationLimboValue) =>
  (state: CellState) => {
    state.integrationLimbo.put(dhtOpHash, integrationLimboValue);
  };

export const putDhtOpData = (dhtOp: DhtOp) => (state: CellState) => {
  const headerHash = dhtOp.header.header.hash;
  state.CAS.put(headerHash, dhtOp.header);

  const entry = getEntry(dhtOp);

  if (entry) {
    state.CAS.put(
      (dhtOp.header.header.content as NewEntryHeader).entry_hash,
      entry
    );
  }
};

export const putDhtOpMetadata = (dhtOp: DhtOp) => (state: CellState) => {
  const headerHash = dhtOp.header.header.hash;

  if (dhtOp.type === DhtOpType.StoreElement) {
    state.metadata.misc_meta.put(headerHash, 'StoreElement');
  } else if (dhtOp.type === DhtOpType.StoreEntry) {
    const entryHash = dhtOp.header.header.content.entry_hash;

    if (dhtOp.header.header.content.type === HeaderType.Update) {
      register_header_on_basis(headerHash, dhtOp.header)(state);
      register_header_on_basis(entryHash, dhtOp.header)(state);
    }

    register_header_on_basis(entryHash, dhtOp.header)(state);
    update_entry_dht_status(entryHash)(state);
  } else if (dhtOp.type === DhtOpType.RegisterAgentActivity) {
    state.metadata.misc_meta.put(headerHash, {
      ChainItem: dhtOp.header.header.content.timestamp,
    });

    state.metadata.misc_meta.put(dhtOp.header.header.content.author, {
      ChainStatus: ChainStatus.Valid,
    });
  } else if (
    dhtOp.type === DhtOpType.RegisterUpdatedContent ||
    dhtOp.type === DhtOpType.RegisterUpdatedElement
  ) {
    register_header_on_basis(
      dhtOp.header.header.content.original_header_address,
      dhtOp.header
    )(state);
    register_header_on_basis(
      dhtOp.header.header.content.original_entry_address,
      dhtOp.header
    )(state);
    update_entry_dht_status(dhtOp.header.header.content.original_entry_address)(
      state
    );
  } else if (
    dhtOp.type === DhtOpType.RegisterDeletedBy ||
    dhtOp.type === DhtOpType.RegisterDeletedEntryHeader
  ) {
    register_header_on_basis(
      dhtOp.header.header.content.deletes_address,
      dhtOp.header
    )(state);
    register_header_on_basis(
      dhtOp.header.header.content.deletes_entry_address,
      dhtOp.header
    )(state);

    update_entry_dht_status(dhtOp.header.header.content.deletes_entry_address)(
      state
    );
  } else if (dhtOp.type === DhtOpType.RegisterAddLink) {
    const key: LinkMetaKey = {
      base: dhtOp.header.header.content.base_address,
      header_hash: headerHash,
      tag: dhtOp.header.header.content.tag,
      zome_id: dhtOp.header.header.content.zome_id,
    };
    const value: LinkMetaVal = {
      link_add_hash: headerHash,
      tag: dhtOp.header.header.content.tag,
      target: dhtOp.header.header.content.target_address,
      timestamp: dhtOp.header.header.content.timestamp,
      zome_id: dhtOp.header.header.content.zome_id,
    };
    state.metadata.link_meta.push({ key, value });
  } else if (dhtOp.type === DhtOpType.RegisterRemoveLink) {
    const val: SysMetaVal = {
      DeleteLink: headerHash,
    };

    putSystemMetadata(dhtOp.header.header.content.link_add_address, val)(state);
  }
};

function is_header_alive(state: CellState, headerHash: HeaderHash): boolean {
  const dhtHeaders = state.metadata.system_meta.get(headerHash);
  if (dhtHeaders) {
    const isHeaderDeleted = !!dhtHeaders.find(
      metaVal =>
        (
          metaVal as {
            Delete: HeaderHash;
          }
        ).Delete
    );
    return !isHeaderDeleted;
  }
  return true;
}

const update_entry_dht_status =
  (entryHash: EntryHash) => (state: CellState) => {
    const headers = getHeadersForEntry(state, entryHash);

    const entryIsAlive = headers.some(header =>
      is_header_alive(state, header.header.hash)
    );

    state.metadata.misc_meta.put(entryHash, {
      EntryStatus: entryIsAlive ? EntryDhtStatus.Live : EntryDhtStatus.Dead,
    });
  };

export const register_header_on_basis =
  (basis: AnyDhtHash, header: SignedHeaderHashed) => (state: CellState) => {
    let value: SysMetaVal | undefined;
    const headerType = header.header.content.type;
    if (headerType === HeaderType.Create) {
      value = { NewEntry: header.header.hash };
    } else if (headerType === HeaderType.Update) {
      value = { Update: header.header.hash };
    } else if (headerType === HeaderType.Delete) {
      value = { Delete: header.header.hash };
    }

    if (value) {
      putSystemMetadata(basis, value)(state);
    }
  };

export const putSystemMetadata =
  (basis: AnyDhtHash, value: SysMetaVal) => (state: CellState) => {
    if (!state.metadata.system_meta.has(basis)) {
      state.metadata.system_meta.put(basis, []);
    }

    if (!state.metadata.system_meta.get(basis).find(v => isEqual(v, value))) {
      state.metadata.system_meta.get(basis).push(value);
    }
  };

export const putDhtOpToIntegrated =
  (dhtOpHash: DhtOpHash, integratedValue: IntegratedDhtOpsValue) =>
  (state: CellState) => {
    state.integratedDHTOps.put(dhtOpHash, integratedValue);
  };
