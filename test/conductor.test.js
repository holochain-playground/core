import {
  Conductor,
  createConductors,
  ImmediateExecutor,
  sampleDnaTemplate,
} from '../dist';
import { expect } from '@esm-bundle/chai';

describe('Conductor', () => {
  it('create conductors and call zome fn', async () => {
    const conductors = await createConductors(
      3,
      new ImmediateExecutor(),
      [],
      sampleDnaTemplate()
    );

    const cell = conductors[0].getAllCells()[0];

    const result = await conductors[0].callZomeFn({
      cellId: cell.cellId,
      cap: null,
      fnName: 'create_entry',
      payload: { content: 'hi' },
      zome: 'sample',
    });

    expect(result).to.be.ok;
  });
});
