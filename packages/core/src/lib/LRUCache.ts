/**
 * A simple Least Recently Used (LRU) Cache wrapper around Map.
 * When the size limit is reached, removing the first (oldest) key clears space.
 */
export class LRUCache<K, V> {
  private map: Map<K, V>;
  private maxSize: number;

  constructor(maxSize = 50) {
    this.map = new Map<K, V>();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const val = this.map.get(key)!;
    // Move to end (most recently used)
    this.map.delete(key);
    this.map.set(key, val);
    return val;
  }

  set(key: K, value: V): this {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxSize) {
      // Evict oldest (Map iterates in insertion order)
      const firstKey = this.map.keys().next().value;
      if (firstKey !== undefined) {
         this.map.delete(firstKey);
      }
    }
    this.map.set(key, value);
    return this;
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  delete(key: K): boolean {
    return this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}
