import { Hash } from '@holochain-open-dev/core-types';
import { distance, compareBigInts } from '../../processors/hash';

export function getClosestNeighbors(
  peers: Hash[],
  targetHash: Hash,
  numNeighbors: number
): Hash[] {
  const sortedPeers = peers.sort((agentA: Hash, agentB: Hash) => {
    const distanceA = Math.min(distance(targetHash, agentA), distance(agentA, targetHash));
    const distanceB = Math.min(distance(targetHash, agentB), distance(agentB, targetHash));
    return compareBigInts(distanceB, distanceA);
});

  return sortedPeers.slice(0, numNeighbors);
}

export function getFarthestNeighbors(
  peers: Hash[],
  targetHash: Hash,
  numNeighbors: number
): Hash[] {
  const sortedPeers = peers.sort((agentA: Hash, agentB: Hash) => {
    const distanceA = Math.min(distance(targetHash, agentA), distance(agentA, targetHash));
    const distanceB = Math.min(distance(targetHash, agentB), distance(agentB, targetHash));
    return compareBigInts(distanceA, distanceB);
});

  return sortedPeers.slice(0, numNeighbors);
}
