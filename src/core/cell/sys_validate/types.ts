import { Hash } from '@holochain-open-dev/core-types';

export type ValidationOutcome =
  | {
      resolved: true;
      valid: boolean;
    }
  | {
      resolved: false;
      depsHashes: Array<Hash>;
    };
