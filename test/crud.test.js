import { createConductors, demoDnaTemplate } from '../dist';
import { expect } from '@esm-bundle/chai';
import { sleep } from './utils';

describe('CRUD', () => {
  it('create, update and delete an entry', async function () {
    this.timeout(0);

    const conductors = await createConductors(10, [], demoDnaTemplate());
    await sleep(10000);

    const cell = conductors[0].getAllCells()[0];

    let headerHash = await conductors[0].callZomeFn({
      cellId: cell.cellId,
      cap: null,
      fnName: 'create_entry',
      payload: { content: 'hi' },
      zome: 'demo_entries',
    });

    expect(headerHash).to.be.ok;
    await sleep(4000);

    const content = await conductors[0].callZomeFn({
      cellId: cell.cellId,
      cap: null,
      fnName: 'get',
      payload: { hash: headerHash },
      zome: 'demo_entries',
    });

    expect(content).to.be.ok;

    const entryHash = await conductors[0].callZomeFn({
      cellId: cell.cellId,
      cap: null,
      fnName: 'hash_entry',
      payload: {
        entry: content.entry,
      },
      zome: 'demo_entries',
    });

    expect(entryHash).to.be.ok;
 
    try {
      await conductors[0].callZomeFn({
        cellId: cell.cellId,
        cap: null,
        fnName: 'update_entry',
        payload: {
          original_header_address: entryHash,
          new_content: 'hi2',
        },
        zome: 'demo_entries',
      });
      expect(false).to.be.ok;
    } catch (e) {
      expect(true).to.be.ok;
    }

    const updatehash = await conductors[0].callZomeFn({
      cellId: cell.cellId,
      cap: null,
      fnName: 'update_entry',
      payload: {
        original_header_address: headerHash,
        new_content: 'hi2',
      },
      zome: 'demo_entries',
    });

    expect(updatehash).to.be.ok;

    const deletehash = await conductors[0].callZomeFn({
      cellId: cell.cellId,
      cap: null,
      fnName: 'delete_entry',
      payload: {
        deletes_address: headerHash,
      },
      zome: 'demo_entries',
    });

    expect(deletehash).to.be.ok;

    await sleep(1000);

    const getresult = await conductors[0].callZomeFn({
      cellId: cell.cellId,
      cap: null,
      fnName: 'get_details',
      payload: {
        hash: headerHash,
      },
      zome: 'demo_entries',
    });
    expect(getresult.content.updates.length).to.equal(1);
  });
});
