import LRUCache from "lru-cache";

/**
 * Checks if a value is a numeric string.
 * @param str - The value to check
 * @returns True if the value is a numeric string, false otherwise
 */
function isNumeric(str: unknown): str is string {
  if (typeof str !== "string") return false;
  return !isNaN(Number(str)) && !isNaN(parseFloat(str));
}

/**
 * Extended LRU (Least Recently Used) cache with additional configuration options.
 * Wraps the lru-cache library with auto-parsing of numeric options and cache disabling support.
 *
 * Features:
 * - Automatically parses string numbers in configuration
 * - Can be disabled by setting ttl or max to 0
 * - When disabled, falls back to direct fetch method calls without caching
 *
 * @template K - The type of keys in the cache
 * @template V - The type of values in the cache
 */
class LruCache<K = any, V = any> extends LRUCache<K, V> {
  /**
   * Creates a new LruCache instance.
   * @param options - LRU cache configuration options
   * @returns Either an LRUCache instance or a pass-through object if caching is disabled
   */
  constructor(options: any) {
    // Parse numeric strings to actual numbers
    if (isNumeric(options.max)) options.max = parseInt(options.max);
    if (isNumeric(options.ttl)) options.ttl = parseInt(options.ttl);

    // Setting cache to 0 will disable it - return a pass-through object
    if (options.ttl === 0 || options.max === 0) {
      // Return a minimal object that just calls the fetch method directly
      // This effectively disables caching
      return {
        fetch: options.fetchMethod,
      } as any;
    } else {
      super(options);
    }
  }
}

export default LruCache;
