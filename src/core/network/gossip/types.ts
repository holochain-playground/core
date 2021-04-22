import {
  AgentPubKey,
  DHTOp,
  Dictionary,
  Hash,
} from '@holochain-open-dev/core-types';
import { DhtArc } from '../dht_arc';

// From https://github.com/holochain/holochain/blob/develop/crates/kitsune_p2p/kitsune_p2p/src/types/gossip.rs

export interface ReqOpHashesEvt {
  from_agent: AgentPubKey;
  to_agent: AgentPubKey;
  dht_arc: DhtArc;
  since_utc_epoch_s: number | undefined;
  until_utc_epoch_s: number | undefined;
  op_count: OpCount;
}

export interface ReqOpDataEvt {
  from_agent: AgentPubKey;
  to_agent: AgentPubKey;
  op_hashes: Array<Hash>;
  peer_hashes: Array<AgentPubKey>;
}

export interface GossipEvt {
  from_agent: AgentPubKey;
  to_agent: AgentPubKey;
  ops: Dictionary<DHTOp>;
  agents: Array<AgentPubKey>;
}

export type OpConsistency =
  | 'Consistent'
  | {
      // There are new hash since last gossip request
      Variance: Array<Hash>;
    };

export type OpCount =
  | 'Variance'
  | {
      Consistent: number;
    };

export type OpHashesAgentHashes = [OpConsistency, Array<[AgentPubKey, number]>];

export type LocalOpHashesAgentHashes = [
  Array<Hash>,
  Array<[AgentPubKey, number]>
];

export type OpDataAgentInfo = [Dictionary<DHTOp>, Array<AgentPubKey>];
