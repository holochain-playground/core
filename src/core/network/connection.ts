import { AgentPubKey } from '@holochain/conductor-api';
import isEqual from 'lodash-es/isEqual';

import { Cell } from '../cell';
import { NetworkRequest } from './network-request';

export class Connection {
  private _closed = false;

  get closed() {
    return this._closed;
  }

  close() {
    this._closed = false;
  }

  constructor(public opener: Cell, public receiver: Cell) {
    if (
      opener.p2p.badAgents.find(a => isEqual(a, receiver.agentPubKey)) ||
      receiver.p2p.badAgents.find(a => isEqual(a, opener.agentPubKey))
    ) {
      throw new Error('Connection closed!');
    }
  }

  sendRequest<T>(
    fromAgent: AgentPubKey,
    networkRequest: NetworkRequest<T>
  ): Promise<T> {
    if (this.closed) throw new Error('Connection closed!');

    if (isEqual(this.opener.agentPubKey, fromAgent)) {
      return networkRequest(this.receiver);
    } else if (isEqual(this.receiver.agentPubKey, fromAgent)) {
      return networkRequest(this.opener);
    }
    throw new Error('Bad request');
  }

  getPeer(myAgentPubKey: AgentPubKey): Cell {
    if (isEqual(myAgentPubKey, this.opener.agentPubKey)) return this.receiver;
    return this.opener;
  }
}
