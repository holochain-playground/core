import { Entry, Hash, Element } from '@holochain-open-dev/core-types';
import { GetOptions, GetStrategy } from '../../../types';
import { Cell } from '../../cell';
import { HostFn, HostFnWorkspace } from '../host-fn';

export type Get = (
  args: Hash,
  options?: GetOptions
) => Promise<Element | undefined>;

// Creates a new Create header and its entry in the source chain
export const get: HostFn<Get> = (workspace: HostFnWorkspace): Get => async (
  hash,
  options
): Promise<Element | undefined> => {
  if (!hash) throw new Error(`Cannot get with undefined hash`);

  options = options || { strategy: GetStrategy.Contents };

  return workspace.cascade.dht_get(hash, options);
};