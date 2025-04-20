export namespace Maps {
  export function getOrSet<K, V>(
    map: Map<K, V>,
    key: K,
    defaultValue: () => V,
  ): V {
    if (map.has(key)) {
      return map.get(key)!;
    } else {
      const value = defaultValue();
      map.set(key, value);
      return value;
    }
  }
}
