import { logger } from "../logging/logger";

interface CacheEntry<T = any> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

export class MemoryCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize = 1000, defaultTTL = 300000) { // 5 minutes default TTL
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 300000);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    logger.debug("Cache hit", {
      service: "cache",
      data: { key, age: Date.now() - entry.createdAt }
    });

    return entry.value;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const ttlMs = ttl || this.defaultTTL;
    const now = Date.now();

    // If cache is at max size, remove oldest entry
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      expiresAt: now + ttlMs,
      createdAt: now
    });

    logger.debug("Cache set", {
      service: "cache",
      data: { key, ttl: ttlMs }
    });
  }

  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    
    if (deleted) {
      logger.debug("Cache delete", {
        service: "cache",
        data: { key }
      });
    }

    return deleted;
  }

  async clear(): Promise<void> {
    const size = this.cache.size;
    this.cache.clear();
    
    logger.info("Cache cleared", {
      service: "cache",
      data: { deletedCount: size }
    });
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async keys(): Promise<string[]> {
    const now = Date.now();
    const validKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now <= entry.expiresAt) {
        validKeys.push(key);
      }
    }

    return validKeys;
  }

  async size(): Promise<number> {
    this.cleanup();
    return this.cache.size;
  }

  async stats(): Promise<{
    size: number;
    maxSize: number;
    hitRate?: number;
    oldestEntry?: number;
    newestEntry?: number;
  }> {
    this.cleanup();
    
    const entries = Array.from(this.cache.values());
    const now = Date.now();

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.createdAt)) : undefined,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.createdAt)) : undefined,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      logger.debug("Cache cleanup completed", {
        service: "cache",
        data: { deletedCount, remainingSize: this.cache.size }
      });
    }
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      logger.debug("Cache evicted oldest entry", {
        service: "cache",
        data: { evictedKey: oldestKey, age: Date.now() - oldestTime }
      });
    }
  }
}

// Create cache instances for different use cases
export const analysisCache = new MemoryCache(500, 3600000); // 1 hour TTL for analysis results
export const userCache = new MemoryCache(1000, 1800000); // 30 minutes TTL for user data
export const ideaCache = new MemoryCache(2000, 900000); // 15 minutes TTL for ideas
export const complianceCache = new MemoryCache(200, 7200000); // 2 hours TTL for compliance scans

// Cache decorator function
export function cached<T extends any[], R>(
  cache: MemoryCache,
  keyGenerator: (...args: T) => string,
  ttl?: number
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: T): Promise<R> {
      const cacheKey = keyGenerator(...args);
      
      // Try to get from cache first
      const cachedResult = await cache.get<R>(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);
      
      // Store in cache
      await cache.set(cacheKey, result, ttl);
      
      return result;
    };

    return descriptor;
  };
}

// Helper functions for cache key generation
export function generateCacheKey(prefix: string, ...parts: (string | number)[]): string {
  return `${prefix}:${parts.join(':')}`;
}

export function generateUserCacheKey(userId: string, suffix: string): string {
  return generateCacheKey('user', userId, suffix);
}

export function generateIdeaCacheKey(ideaId: number, userId: string): string {
  return generateCacheKey('idea', ideaId, userId);
}

export function generateAnalysisCacheKey(ideaId: number, trackType: string): string {
  return generateCacheKey('analysis', ideaId, trackType);
}