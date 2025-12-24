import { Redis } from "@upstash/redis";

type RedisClient = InstanceType<typeof Redis>;

let _client: RedisClient | null = null;

function getClientOrNull(): RedisClient | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  if (!_client) {
    _client = new Redis({ url, token });
  }
  return _client;
}

/**
 * A safe Redis proxy:
 * - If env is missing (e.g. Docker build), acts like "cache disabled".
 * - If env exists, forwards calls to real Upstash Redis client.
 *
 * This avoids changing call sites: you can keep using `redis.get/set/...`
 */
export const redis = new Proxy(
  {},
  {
    get(_target, prop: string) {
      const client = getClientOrNull();

      // Cache disabled: return a noop async function for common Redis methods
      if (!client) {
        // For methods you use a lot, return sensible noops
        if (prop === "get") return async () => null;
        if (prop === "mget") return async () => [];
        if (prop === "set") return async () => "OK";
        if (prop === "setex") return async () => "OK";
        if (prop === "del") return async () => 0;
        if (prop === "exists") return async () => 0;
        if (prop === "expire") return async () => 0;
        if (prop === "incr") return async () => 0;

        // Default: noop async
        return async () => null;
      }

      // Cache enabled: forward to real client method/property
      const value = (client as any)[prop];
      return typeof value === "function" ? value.bind(client) : value;
    },
  }
) as unknown as RedisClient;

// Cache key prefixes
export const CACHE_KEYS = {
  PRODUCTS_ALL: "products:all",
  PRODUCT_BY_ID: (id: number) => `product:${id}`,
};

// Cache TTL (seconds)
export const CACHE_TTL = {
  PRODUCTS: 60 * 10,
  PRODUCT: 60 * 30,
};
