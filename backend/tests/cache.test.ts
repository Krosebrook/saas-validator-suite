import { describe, it, expect, beforeEach, vi } from "vitest";
import { MemoryCache } from "../cache/cache";

describe("MemoryCache", () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache(3, 1000); // Small cache with 1 second TTL for testing
  });

  describe("basic operations", () => {
    it("should set and get values", async () => {
      await cache.set("key1", "value1");
      const result = await cache.get("key1");
      expect(result).toBe("value1");
    });

    it("should return null for non-existent keys", async () => {
      const result = await cache.get("nonexistent");
      expect(result).toBeNull();
    });

    it("should delete values", async () => {
      await cache.set("key1", "value1");
      const deleted = await cache.delete("key1");
      expect(deleted).toBe(true);
      
      const result = await cache.get("key1");
      expect(result).toBeNull();
    });

    it("should check if key exists", async () => {
      await cache.set("key1", "value1");
      expect(await cache.has("key1")).toBe(true);
      expect(await cache.has("nonexistent")).toBe(false);
    });
  });

  describe("TTL handling", () => {
    it("should expire values after TTL", async () => {
      await cache.set("key1", "value1", 50); // 50ms TTL
      
      // Should exist immediately
      expect(await cache.get("key1")).toBe("value1");
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should be expired
      expect(await cache.get("key1")).toBeNull();
    });

    it("should use default TTL when not specified", async () => {
      const shortCache = new MemoryCache(10, 50); // 50ms default TTL
      await shortCache.set("key1", "value1");
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(await shortCache.get("key1")).toBeNull();
    });
  });

  describe("size management", () => {
    it("should evict oldest entry when max size reached", async () => {
      await cache.set("key1", "value1");
      await cache.set("key2", "value2");
      await cache.set("key3", "value3");
      
      // All should exist
      expect(await cache.has("key1")).toBe(true);
      expect(await cache.has("key2")).toBe(true);
      expect(await cache.has("key3")).toBe(true);
      
      // Adding 4th item should evict first
      await cache.set("key4", "value4");
      
      expect(await cache.has("key1")).toBe(false); // Evicted
      expect(await cache.has("key2")).toBe(true);
      expect(await cache.has("key3")).toBe(true);
      expect(await cache.has("key4")).toBe(true);
    });

    it("should report correct size", async () => {
      expect(await cache.size()).toBe(0);
      
      await cache.set("key1", "value1");
      expect(await cache.size()).toBe(1);
      
      await cache.set("key2", "value2");
      expect(await cache.size()).toBe(2);
      
      await cache.delete("key1");
      expect(await cache.size()).toBe(1);
    });
  });

  describe("stats", () => {
    it("should provide cache statistics", async () => {
      await cache.set("key1", "value1");
      await cache.set("key2", "value2");
      
      const stats = await cache.stats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(3);
      expect(stats.oldestEntry).toBeDefined();
      expect(stats.newestEntry).toBeDefined();
    });
  });

  describe("keys", () => {
    it("should return all valid keys", async () => {
      await cache.set("key1", "value1");
      await cache.set("key2", "value2");
      
      const keys = await cache.keys();
      expect(keys).toContain("key1");
      expect(keys).toContain("key2");
      expect(keys.length).toBe(2);
    });

    it("should exclude expired keys from keys list", async () => {
      await cache.set("key1", "value1", 50);
      await cache.set("key2", "value2", 10000);
      
      // Wait for first key to expire
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const keys = await cache.keys();
      expect(keys).not.toContain("key1");
      expect(keys).toContain("key2");
    });
  });

  describe("clear", () => {
    it("should clear all entries", async () => {
      await cache.set("key1", "value1");
      await cache.set("key2", "value2");
      
      expect(await cache.size()).toBe(2);
      
      await cache.clear();
      
      expect(await cache.size()).toBe(0);
      expect(await cache.get("key1")).toBeNull();
      expect(await cache.get("key2")).toBeNull();
    });
  });
});