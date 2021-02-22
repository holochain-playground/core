import { Hash } from '@holochain-open-dev/core-types';
import { HostFn } from '../../host-fn';
export declare type DeleteCapGrant = (args: {
    header_hash: Hash;
}) => Promise<Hash>;
export declare const delete_cap_grant: HostFn<DeleteCapGrant>;