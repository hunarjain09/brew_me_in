/**
 * Mock Redis client for testing
 */

export interface MockRedisClient {
  get: jest.Mock;
  set: jest.Mock;
  del: jest.Mock;
  exists: jest.Mock;
  expire: jest.Mock;
  ttl: jest.Mock;
  incr: jest.Mock;
  decr: jest.Mock;
  hget: jest.Mock;
  hset: jest.Mock;
  hdel: jest.Mock;
  hgetall: jest.Mock;
  lpush: jest.Mock;
  rpush: jest.Mock;
  lpop: jest.Mock;
  rpop: jest.Mock;
  lrange: jest.Mock;
  llen: jest.Mock;
  sadd: jest.Mock;
  srem: jest.Mock;
  smembers: jest.Mock;
  sismember: jest.Mock;
  zadd: jest.Mock;
  zrem: jest.Mock;
  zrange: jest.Mock;
  zrangebyscore: jest.Mock;
  keys: jest.Mock;
  flushall: jest.Mock;
  flushdb: jest.Mock;
  quit: jest.Mock;
  connect: jest.Mock;
  disconnect: jest.Mock;
  on: jest.Mock;
}

export const createMockRedisClient = (): MockRedisClient => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  incr: jest.fn(),
  decr: jest.fn(),
  hget: jest.fn(),
  hset: jest.fn(),
  hdel: jest.fn(),
  hgetall: jest.fn(),
  lpush: jest.fn(),
  rpush: jest.fn(),
  lpop: jest.fn(),
  rpop: jest.fn(),
  lrange: jest.fn(),
  llen: jest.fn(),
  sadd: jest.fn(),
  srem: jest.fn(),
  smembers: jest.fn(),
  sismember: jest.fn(),
  zadd: jest.fn(),
  zrem: jest.fn(),
  zrange: jest.fn(),
  zrangebyscore: jest.fn(),
  keys: jest.fn(),
  flushall: jest.fn(),
  flushdb: jest.fn(),
  quit: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn(),
});

export const mockRedis = createMockRedisClient();

// Helper functions
export const mockRedisGet = (key: string, value: string | null) => {
  mockRedis.get.mockImplementation((k: string) => {
    if (k === key) return Promise.resolve(value);
    return Promise.resolve(null);
  });
};

export const mockRedisSet = () => {
  mockRedis.set.mockResolvedValue('OK');
};

export const mockRedisDel = () => {
  mockRedis.del.mockResolvedValue(1);
};

export const resetRedisMocks = () => {
  Object.values(mockRedis).forEach((mock) => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
};
