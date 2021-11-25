import { Element, HeaderHashB64 } from '@holochain-open-dev/core-types';
import {
  HeaderHash,
  NewEntryHeader,
  SignedHeaderHashed,
} from '@holochain/conductor-api';
import isEqual from 'lodash-es/isEqual';

import { CellState } from '../state';

/**
 * Returns the header hashes which don't have their DHTOps in the authoredDHTOps DB
 */
export function getNewHeaders(state: CellState): Array<HeaderHash> {
  const dhtOps = state.authoredDHTOps.values();
  const headerHashesAlreadyPublished = dhtOps.map(
    dhtOp => dhtOp.op.header.header.hash
  );
  return state.sourceChain.filter(
    headerHash =>
      !headerHashesAlreadyPublished.find(h => isEqual(h, headerHash))
  );
}

export function getAllAuthoredHeaders(
  state: CellState
): Array<SignedHeaderHashed> {
  return state.sourceChain.map(headerHash => state.CAS.get(headerHash));
}

export function getSourceChainElements(
  state: CellState,
  fromIndex: number,
  toIndex: number
): Element[] {
  const elements: Element[] = [];

  for (let i = fromIndex; i < toIndex; i++) {
    const element = getSourceChainElement(state, i);
    if (element) elements.push(element);
  }

  return elements;
}

export function getSourceChainElement(
  state: CellState,
  index: number
): Element | undefined {
  const headerHash = state.sourceChain[index];
  const signed_header: SignedHeaderHashed = state.CAS.get(headerHash);

  let entry = undefined;
  const entryHash = (signed_header.header.content as NewEntryHeader).entry_hash;
  if (entryHash) {
    entry = state.CAS.get(entryHash);
  }

  return {
    entry,
    signed_header,
  };
}
