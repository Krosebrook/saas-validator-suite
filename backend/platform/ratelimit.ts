interface RateLimitConfig {
  window: number;
  max: number;
}

const PLAN_LIMITS: Record<string, RateLimitConfig> = {
  free: { window: 60, max: 10 },
  pro: { window: 60, max: 100 },
  enterprise: { window: 60, max: 1000 }
};

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(userId: string, route: string, plan: string = 'free'): Promise<{ allowed: boolean; retryAfter?: number }> {
  const config = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const key = `${userId}:${route}`;
  const now = Date.now();

  try {
    const existing = rateLimitStore.get(key);

    if (existing && existing.resetAt > now) {
      if (existing.count >= config.max) {
        return {
          allowed: false,
          retryAfter: Math.ceil((existing.resetAt - now) / 1000)
        };
      }

      existing.count++;
      return { allowed: true };
    }

    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + (config.window * 1000)
    });

    setTimeout(() => rateLimitStore.delete(key), config.window * 1000);

    return { allowed: true };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return { allowed: true };
  }
}
