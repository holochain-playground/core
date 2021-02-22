import { Hash, Element } from '@holochain-open-dev/core-types';
import { GetOptions } from '../../../types';
import { HostFn } from '../host-fn';
export declare type Get = (args: Hash, options?: GetOptions) => Promise<Element | undefined>;
export declare const get: HostFn<Get>;