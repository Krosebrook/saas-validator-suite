import { APIError } from "encore.dev/api";
import { logger } from "../logging/logger";

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (userId: string, endpoint: string) => string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

export class RateLimiter {
  private requests = new Map<string, RateLimitEntry>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyGenerator: (userId, endpoint) => `${userId}:${endpoint}`,
      ...config
    };

    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  async checkLimit(userId: string, endpoint: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    limit: number;
  }> {
    const key = this.config.keyGenerator!(userId, endpoint);
    const now = Date.now();
    
    let entry = this.requests.get(key);
    
    // Create new entry if doesn't exist or window has expired
    if (!entry || now >= entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs,
        firstRequest: now
      };
    }

    // Check if request is allowed
    const allowed = entry.count < this.config.maxRequests;
    
    if (allowed) {
      entry.count++;
      this.requests.set(key, entry);
    }

    const remaining = Math.max(0, this.config.maxRequests - entry.count);

    logger.debug("Rate limit check", {
      service: "security",
      data: {
        userId,
        endpoint,
        allowed,
        count: entry.count,
        limit: this.config.maxRequests,
        remaining,
        resetTime: entry.resetTime
      }
    });

    if (!allowed) {
      logger.warn("Rate limit exceeded", {
        service: "security",
        data: {
          userId,
          endpoint,
          count: entry.count,
          limit: this.config.maxRequests,
          windowMs: this.config.windowMs
        }
      });
    }

    return {
      allowed,
      remaining,
      resetTime: entry.resetTime,
      limit: this.config.maxRequests
    };
  }

  async reset(userId: string, endpoint?: string): Promise<void> {
    if (endpoint) {
      const key = this.config.keyGenerator!(userId, endpoint);
      this.requests.delete(key);
    } else {
      // Reset all limits for user
      const userPrefix = `${userId}:`;
      for (const key of this.requests.keys()) {
        if (key.startsWith(userPrefix)) {
          this.requests.delete(key);
        }
      }
    }
  }

  private cleanup(): void {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, entry] of this.requests.entries()) {
      if (now >= entry.resetTime) {
        this.requests.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      logger.debug("Rate limit cleanup", {
        service: "security",
        data: { deletedCount, remainingEntries: this.requests.size }
      });
    }
  }

  getStats(): {
    totalEntries: number;
    activeUsers: number;
    topUsers: Array<{ userId: string; totalRequests: number }>;
  } {
    const userStats = new Map<string, number>();
    
    for (const [key, entry] of this.requests.entries()) {
      const userId = key.split(':')[0];
      const current = userStats.get(userId) || 0;
      userStats.set(userId, current + entry.count);
    }

    const topUsers = Array.from(userStats.entries())
      .map(([userId, totalRequests]) => ({ userId, totalRequests }))
      .sort((a, b) => b.totalRequests - a.totalRequests)
      .slice(0, 10);

    return {
      totalEntries: this.requests.size,
      activeUsers: userStats.size,
      topUsers
    };
  }
}

// Create rate limiters for different endpoints
export const standardLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100
});

export const aiAnalysisLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10
});

export const bulkOperationLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5
});

export const authLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 20
});

// Middleware function to apply rate limiting
export async function applyRateLimit(
  limiter: RateLimiter,
  userId: string,
  endpoint: string
): Promise<void> {
  const result = await limiter.checkLimit(userId, endpoint);
  
  if (!result.allowed) {
    throw APIError.resourceExhausted("Rate limit exceeded").withDetails({
      limit: result.limit,
      remaining: result.remaining,
      resetTime: new Date(result.resetTime).toISOString(),
      retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
    });
  }
}

// IP-based rate limiting for unauthenticated requests
interface IpRateLimitEntry {
  count: number;
  resetTime: number;
}

export class IpRateLimiter {
  private requests = new Map<string, IpRateLimitEntry>();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 50) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  async checkLimit(ip: string): Promise<boolean> {
    const now = Date.now();
    let entry = this.requests.get(ip);

    if (!entry || now >= entry.resetTime) {
      entry = {
        count: 1,
        resetTime: now + this.windowMs
      };
      this.requests.set(ip, entry);
      return true;
    }

    if (entry.count >= this.maxRequests) {
      logger.warn("IP rate limit exceeded", {
        service: "security",
        data: { ip, count: entry.count, limit: this.maxRequests }
      });
      return false;
    }

    entry.count++;
    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    let deletedCount = 0;

    for (const [ip, entry] of this.requests.entries()) {
      if (now >= entry.resetTime) {
        this.requests.delete(ip);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      logger.debug("IP rate limit cleanup", {
        service: "security",
        data: { deletedCount, remainingEntries: this.requests.size }
      });
    }
  }
}

export const ipLimiter = new IpRateLimiter(60000, 100); // 100 requests per minute per IP