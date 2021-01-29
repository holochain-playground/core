import { serializeHash } from '@holochain-open-dev/common';
import {
  Hash,
  AgentPubKey,
  Dna,
  Header,
  HeaderType,
  CellId,
  Element,
  Dictionary,
  DHTOp,
  SignedHeaderHashed,
  NewEntryHeader,
  Delete,
  ZomeCallCapGrant,
  Update,
  DeleteLink,
  Entry,
  CapSecret,
} from '@holochain-open-dev/core-types';
import { CellState } from '../state';
import { getAllAuthoredHeaders } from './get';

export function getTipOfChain(cellState: CellState): Hash {
  return cellState.sourceChain[0];
}

export function getAuthor(cellState: CellState): AgentPubKey {
  return getHeaderAt(cellState, 0).header.content.author;
}

export function getDnaHash(state: CellState): Hash {
  const firstHeaderHash = state.sourceChain[state.sourceChain.length - 1];

  const dna: SignedHeaderHashed<Dna> = state.CAS[firstHeaderHash];
  return dna.header.content.hash;
}

export function getHeaderAt(
  cellState: CellState,
  index: number
): SignedHeaderHashed {
  const headerHash = cellState.sourceChain[index];
  return cellState.CAS[headerHash];
}

export function getNextHeaderSeq(cellState: CellState): number {
  return cellState.sourceChain.length;
}

export function getElement(state: CellState, headerHash: Hash): Element {
  const signed_header: SignedHeaderHashed = state.CAS[headerHash];

  let entry;
  if (
    signed_header.header.content.type == HeaderType.Create ||
    signed_header.header.content.type == HeaderType.Update
  ) {
    entry = state.CAS[signed_header.header.content.entry_hash];
  }
  return { signed_header, entry };
}

export function getCellId(state: CellState): CellId {
  const author = getAuthor(state);
  const dna = getDnaHash(state);
  return [dna, author];
}

export function getNonPublishedDhtOps(state: CellState): Dictionary<DHTOp> {
  const nonPublishedDhtOps: Dictionary<DHTOp> = {};
  for (const dhtOpHash of Object.keys(state.authoredDHTOps)) {
    const authoredValue = state.authoredDHTOps[dhtOpHash];
    if (authoredValue.last_publish_time === undefined) {
      nonPublishedDhtOps[dhtOpHash] = authoredValue.op;
    }
  }

  return nonPublishedDhtOps;
}

export function valid_cap_grant(
  state: CellState,
  zome: string,
  fnName: string,
  provenance: AgentPubKey,
  secret: CapSecret | undefined
): boolean {
  if (provenance === getCellId(state)[1]) return true;

  const aliveCapGrantsHeaders: Dictionary<
    SignedHeaderHashed<NewEntryHeader>
  > = {};

  const allHeaders = getAllAuthoredHeaders(state);

  for (const header of allHeaders) {
    if (isCapGrant(header)) {
      aliveCapGrantsHeaders[
        header.header.hash
      ] = header as SignedHeaderHashed<NewEntryHeader>;
    }
  }

  for (const header of allHeaders) {
    const headerContent = header.header.content;
    if (
      (headerContent as Update).original_header_address &&
      aliveCapGrantsHeaders[(headerContent as Update).original_header_address]
    ) {
      delete aliveCapGrantsHeaders[
        (headerContent as Update).original_header_address
      ];
    }
    if (
      (headerContent as Delete).deletes_address &&
      aliveCapGrantsHeaders[(headerContent as Delete).deletes_address]
    ) {
      delete aliveCapGrantsHeaders[(headerContent as Delete).deletes_address];
    }
  }

  const aliveCapGrants: Array<ZomeCallCapGrant> = Object.values(
    aliveCapGrantsHeaders
  ).map(
    headerHash =>
      (state.CAS[headerHash.header.content.entry_hash] as Entry).content
  );

  return !!aliveCapGrants.find(capGrant =>
    isCapGrantValid(capGrant, zome, fnName, provenance, secret)
  );
}

function isCapGrantValid(
  capGrant: ZomeCallCapGrant,
  zome: string,
  fnName: string,
  check_agent: AgentPubKey,
  check_secret: CapSecret | undefined
): boolean {
  if (!capGrant.functions.find(fn => fn.fn_name === fnName && fn.zome === zome))
    return false;

  if (capGrant.access === 'Unrestricted') return true;
  else if (
    (capGrant.access as {
      Assigned: { assignees: AgentPubKey[]; secret: CapSecret };
    }).Assigned
  ) {
    return (capGrant.access as {
      Assigned: {
        secret: CapSecret;
        assignees: AgentPubKey[];
      };
    }).Assigned.assignees.includes(check_agent);
  } else {
    return (
      (capGrant.access as {
        Transferable: { secret: CapSecret };
      }).Transferable.secret === check_secret
    );
  }
}

function isCapGrant(header: SignedHeaderHashed): boolean {
  const content = header.header.content;
  return !!(
    (content as NewEntryHeader).entry_hash &&
    (content as NewEntryHeader).entry_type === 'CapGrant'
  );
}
