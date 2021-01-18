import { SimulatedZomeFunctionContext } from './context';

async function ensure(
  path: string,
  hdk: SimulatedZomeFunctionContext
): Promise<void> {
  const components = path.split('.');
  const parent = components.splice(components.length - 1, 1).join('.');

  await ensure(parent, hdk);

  const headerHash = await hdk.create_entry({
    content: path,
    entry_def_id: 'path',
  });

  const parentHash = await hdk.hash_entry({ content: parent });
  const pathHash = await hdk.hash_entry({ content: parent });

  await hdk.create_link({ base: parentHash, target: pathHash, tag: null });
}

export interface Path {
  ensure: (path: string, hdk: SimulatedZomeFunctionContext) => Promise<void>;
}

export const path = {
  ensure,
};