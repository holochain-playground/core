import {
  deserializeHash,
  Dictionary,
  serializeHash,
} from '@holochain-open-dev/core-types';
import {
  AgentPubKey,
  CellId,
  DnaHash,
  HoloHash,
} from '@holochain/conductor-api';
import flatMap from 'lodash-es/flatMap';

export class HoloHashMap<T> {
  _values: Dictionary<{ hash: HoloHash; value: T }> = {};

  has(key: HoloHash): boolean {
    return !!this._values[this.stringify(key)];
  }

  get(key: HoloHash): T {
    return this._values[this.stringify(key)]?.value;
  }

  put(key: HoloHash, value: T) {
    this._values[this.stringify(key)] = {
      hash: key,
      value,
    };
  }

  delete(key: HoloHash) {
    const str = this.stringify(key);
    if (this._values[str]) {
      this._values[str] = undefined as any;
      delete this._values[str];
    }
  }

  keys() {
    return Object.values(this._values).map(v => v.hash);
  }

  values(): T[] {
    return Object.values(this._values).map(v => v.value);
  }

  entries(): Array<[HoloHash, T]> {
    return Object.entries(this._values).map(([key, value]) => [
      value.hash,
      value.value,
    ]);
  }

  private stringify(holoHash: HoloHash): string {
    return holoHash.toString();
  }
}

export class CellMap<T> {
  // Segmented by DnaHash / AgentPubKey
  #cellMap: HoloHashMap<HoloHashMap<T>> = new HoloHashMap();

  get([dnaHash, agentPubKey]: CellId): T | undefined {
    return this.#cellMap.get(dnaHash)
      ? this.#cellMap.get(dnaHash).get(agentPubKey)
      : undefined;
  }

  valuesForDna(dnaHash: DnaHash): Array<T> {
    const dnaMap = this.#cellMap.get(dnaHash);
    return dnaMap ? dnaMap.values() : [];
  }

  agentsForDna(dnaHash: DnaHash): Array<AgentPubKey> {
    const dnaMap = this.#cellMap.get(dnaHash);
    return dnaMap ? dnaMap.keys() : [];
  }

  put([dnaHash, agentPubKey]: CellId, value: T) {
    if (!this.#cellMap.get(dnaHash))
      this.#cellMap.put(dnaHash, new HoloHashMap());
    this.#cellMap.get(dnaHash).put(agentPubKey, value);
  }

  entries(): Array<[CellId, T]> {
    return this.cellIds().map(
      cellId => [cellId, this.get(cellId)] as [CellId, T]
    );
  }

  values(): Array<T> {
    return this.cellIds().map(cellId => this.get(cellId) as T);
  }

  cellIds(): Array<CellId> {
    const dnaHashes = this.#cellMap.keys();

    return flatMap(dnaHashes, dnaHash =>
      this.#cellMap
        .get(dnaHash)
        .keys()
        .map(agentPubKey => [dnaHash, agentPubKey] as CellId)
    );
  }
}
