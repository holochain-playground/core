import { HostFnWorkspace } from './host-fn';
import { CreateCapGrantFn } from './host-fn/actions/create_cap_grant';
import { CreateEntryFn } from './host-fn/actions/create_entry';
import { CreateLinkFn } from './host-fn/actions/create_link';
import { DeleteCapGrantFn } from './host-fn/actions/delete_cap_grant';
import { DeleteEntryFn } from './host-fn/actions/delete_entry';
import { DeleteLinkFn } from './host-fn/actions/delete_link';
import { UpdateEntryFn } from './host-fn/actions/update_entry';
import { AgentInfoFn } from './host-fn/agent_info';
import { CallRemoteFn } from './host-fn/call_remote';
import { GetFn } from './host-fn/get';
import { GetDetailsFn } from './host-fn/get_detailts';
import { GetLinksFn } from './host-fn/get_links';
import { HashEntryFn } from './host-fn/hash_entry';
import { QueryFn } from './host-fn/query';
import { Path } from './path';
export interface Hdk {
    create_entry: CreateEntryFn;
    delete_entry: DeleteEntryFn;
    update_entry: UpdateEntryFn;
    get: GetFn;
    get_details: GetDetailsFn;
    hash_entry: HashEntryFn;
    create_link: CreateLinkFn;
    delete_link: DeleteLinkFn;
    get_links: GetLinksFn;
    create_cap_grant: CreateCapGrantFn;
    delete_cap_grant: DeleteCapGrantFn;
    call_remote: CallRemoteFn;
    agent_info: AgentInfoFn;
    query: QueryFn;
}
export interface SimulatedZomeFunctionContext extends Hdk {
    path: Path;
}
export declare function buildZomeFunctionContext(workspace: HostFnWorkspace, zome_index: number): SimulatedZomeFunctionContext;
