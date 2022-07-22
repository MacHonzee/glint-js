import LRUCache from 'lru-cache';

function isNumeric(str) {
  if (typeof str != 'string') return false;
  return !isNaN(str) && !isNaN(parseFloat(str));
}

class LruCache extends LRUCache {
  constructor(options) {
    if (isNumeric(options.max)) options.max = parseInt(options.max);
    if (isNumeric(options.ttl)) options.ttl = parseInt(options.ttl);

    // setting cache to 0 will disable it
    if (options.ttl === 0 || options.max === 0) {
      return {
        fetch: options.fetchMethod,
      };
    } else {
      // eslint-disable-next-line constructor-super
      return super(options);
    }
  }
}

export default LruCache;
