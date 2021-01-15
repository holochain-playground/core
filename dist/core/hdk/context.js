import { create_entry } from './actions';
export function buildZomeFunctionContext(zome_index, cell) {
    return {
        create_entry: create_entry(zome_index, cell),
    };
}
//# sourceMappingURL=context.js.map