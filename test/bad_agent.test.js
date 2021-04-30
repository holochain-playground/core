import { createConductors, demoHapp } from '../dist';
import { expect } from '@esm-bundle/chai';
import { sleep } from './utils';

describe('Bad Agent', () => {
  it(`bad agent cheats and gets booted out of the network`, async function () {
    this.timeout(0);

    const conductors = await createConductors(10, [], demoHapp());

    await sleep(100);

    const aliceCell = conductors[0].getAllCells()[0];
    const bobCell = conductors[1].getAllCells()[0];
    const badAgentCell = conductors[2].getAllCells()[0];

    const aliceAddress = aliceCell.cellId[1];
    const bobAddress = bobCell.cellId[1];
    const badAgentAddress = badAgentCell.cellId[1];

    badAgentCell.convertToBadAgent();

    let result = await conductors[0].callZomeFn({
      cellId: aliceCell.cellId,
      cap: null,
      fnName: 'create_entry',
      payload: { content: 'hi' },
      zome: 'demo_entries',
    });
    expect(result).to.be.ok;

    await sleep(100);

    try {
      // Bob is an honest agent: they shouldn't publish a bad action
      await conductors[1].callZomeFn({
        cellId: bobCell.cellId,
        cap: null,
        fnName: 'update_entry',
        payload: { original_header_address: result, new_content: 'hi2' },
        zome: 'demo_entries',
      });
      expect(false).to.be.ok;
    } catch (e) {
      expect(true).to.be.ok;
    }

    result = await conductors[2].callZomeFn({
      cellId: badAgentCell.cellId,
      cap: null,
      fnName: 'update_entry',
      payload: { original_header_address: result, new_content: 'hi2' },
      zome: 'demo_entries',
    });
    expect(result).to.be.ok;

    await sleep(1000);

    const honestCells = conductors
      .map(c => c.getAllCells()[0])
      .filter(cell => cell.agentPubKey !== badAgentAddress);
    const honestCellsWithBadAgentAsNeighbor = honestCells.filter(cell =>
      cell.p2p.neighbors.includes(badAgentAddress)
    );

    expect(honestCellsWithBadAgentAsNeighbor.length).to.equal(0);
  });
});
