import { locationDistance } from '../dist';
import { expect } from '@esm-bundle/chai';

describe('DHT Location', () => {
  it('location distance', async () => {
    expect(locationDistance(10, 5)).to.equal(5);
    expect(locationDistance(5, 10)).to.equal(5);
  });
});
