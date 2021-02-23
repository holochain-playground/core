import {
  CreateLink,
  Dictionary,
  Element,
  Hash,
  NewEntryHeader,
  SignedHeaderHashed,
} from '@holochain-open-dev/core-types';
import { getHashType, HashType } from '../../../processors/hash';
import { GetLinksOptions, GetOptions, GetStrategy } from '../../../types';
import { P2pCell } from '../../network/p2p-cell';
import { Cell } from '../cell';
import { CellState } from '../state';
import { Authority } from './authority';
import { GetLinksResponse, Link } from './types';

export class Cascade {
  constructor(protected state: CellState, protected p2p: P2pCell) {}

  public async dht_get(
    hash: Hash,
    options: GetOptions
  ): Promise<Element | undefined> {
    // TODO rrDHT arcs
    const authority = new Authority(this.state, this.p2p);

    const isPresent = this.state.CAS[hash];

    // TODO only return local if GetOptions::content() is given
    if (isPresent && options.strategy === GetStrategy.Contents) {
      const hashType = getHashType(hash);

      if (hashType === HashType.ENTRY) {
        const entry = this.state.CAS[hash];
        const signed_header = Object.values(this.state.CAS).find(
          header =>
            (header as SignedHeaderHashed).header &&
            (header as SignedHeaderHashed<NewEntryHeader>).header.content
              .entry_hash === hash
        );

        return {
          entry,
          signed_header,
        };
      }

      if (hashType === HashType.HEADER) {
        const signed_header = this.state.CAS[hash];
        const entry = this.state.CAS[
          (signed_header as SignedHeaderHashed<NewEntryHeader>).header.content
            .entry_hash
        ];
        return {
          entry,
          signed_header,
        };
      }
    }

    return this.p2p.get(hash, options);
  }

  public async dht_get_links(
    base_address: Hash,
    options: GetLinksOptions
  ): Promise<Link[]> {
    // TODO: check if we are an authority

    const linksResponses = await this.p2p.get_links(base_address, options);
    // Map and flatten adds
    const linkAdds: Dictionary<CreateLink | undefined> = {};
    for (const responses of linksResponses) {
      for (const linkAdd of responses.link_adds) {
        linkAdds[linkAdd.header.hash] = linkAdd.header.content;
      }
    }

    for (const responses of linksResponses) {
      for (const linkRemove of responses.link_removes) {
        const removedAddress = linkRemove.header.content.link_add_address;
        if (linkAdds[removedAddress]) linkAdds[removedAddress] = undefined;
      }
    }

    const resultingLinks: Link[] = [];

    for (const liveLink of Object.values(linkAdds)) {
      if (liveLink)
        resultingLinks.push({
          base: liveLink.base_address,
          target: liveLink.target_address,
          tag: liveLink.tag,
        });
    }

    return resultingLinks;
  }
}
