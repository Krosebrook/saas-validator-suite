import { api, Header } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { logger } from "../logging/logger";
import { handleError } from "../logging/errors";
import { standardLimiter, aiAnalysisLimiter, bulkOperationLimiter, applyRateLimit } from "./ratelimit";

interface SecurityHeaders {
  userAgent?: Header<"User-Agent">;
  xForwardedFor?: Header<"X-Forwarded-For">;
  xRealIp?: Header<"X-Real-IP">;
  referer?: Header<"Referer">;
}

interface SecurityAnalysis {
  riskScore: number;
  threats: string[];
  recommendations: string[];
  allowRequest: boolean;
}

interface RateLimitStats {
  totalEntries: number;
  activeUsers: number;
  topUsers: Array<{ userId: string; totalRequests: number }>;
}

// Security analysis middleware
export function analyzeRequest(headers: SecurityHeaders): SecurityAnalysis {
  const threats: string[] = [];
  const recommendations: string[] = [];
  let riskScore = 0;

  // Check User-Agent
  if (!headers.userAgent) {
    threats.push("Missing User-Agent header");
    riskScore += 20;
  } else {
    const userAgent = headers.userAgent.toLowerCase();
    
    // Check for suspicious user agents
    const suspiciousPatterns = [
      'bot', 'crawler', 'spider', 'scraper', 'hack', 'attack',
      'sqlmap', 'nikto', 'nmap', 'curl', 'wget'
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (userAgent.includes(pattern)) {
        threats.push(`Suspicious User-Agent pattern: ${pattern}`);
        riskScore += 30;
        break;
      }
    }
  }

  // Check for common attack patterns in headers
  const attackPatterns = [
    /script/i, /javascript/i, /onload/i, /onerror/i, /onclick/i,
    /select.*from/i, /union.*select/i, /drop.*table/i,
    /<script/i, /<iframe/i, /<object/i
  ];

  const allHeaders = Object.values(headers).join(' ');
  for (const pattern of attackPatterns) {
    if (pattern.test(allHeaders)) {
      threats.push("Potential XSS/SQL injection in headers");
      riskScore += 50;
      break;
    }
  }

  // Check referer for suspicious domains
  if (headers.referer) {
    const suspiciousDomains = [
      'malware', 'phishing', 'suspicious', 'attack', 'hack'
    ];
    
    for (const domain of suspiciousDomains) {
      if (headers.referer.toLowerCase().includes(domain)) {
        threats.push(`Suspicious referer domain: ${domain}`);
        riskScore += 40;
        break;
      }
    }
  }

  // Generate recommendations
  if (riskScore > 70) {
    recommendations.push("Block request immediately");
    recommendations.push("Log security incident");
    recommendations.push("Consider IP blocking");
  } else if (riskScore > 40) {
    recommendations.push("Increase monitoring for this request");
    recommendations.push("Apply additional rate limiting");
  } else if (riskScore > 20) {
    recommendations.push("Log for monitoring");
  }

  return {
    riskScore,
    threats,
    recommendations,
    allowRequest: riskScore < 70
  };
}

// Get rate limit statistics
export const getRateLimitStats = api<void, {
  standard: RateLimitStats;
  aiAnalysis: RateLimitStats;
  bulkOperation: RateLimitStats;
}>(
  { expose: true, method: "GET", path: "/security/rate-limits/stats" },
  async () => {
    try {
      return {
        standard: standardLimiter.getStats(),
        aiAnalysis: aiAnalysisLimiter.getStats(),
        bulkOperation: bulkOperationLimiter.getStats()
      };
    } catch (error) {
      handleError(error, { service: "security", endpoint: "rate-limits/stats" });
    }
  }
);

// Reset rate limits for a user (admin only)
export const resetUserRateLimit = api<{
  userId: string;
  endpoint?: string;
}, { success: boolean; message: string }>(
  { auth: true, expose: true, method: "POST", path: "/security/rate-limits/reset" },
  async (req) => {
    try {
      const auth = getAuthData()!;
      
      // In a real app, you'd check if the user is an admin
      logger.info("Rate limit reset requested", {
        service: "security",
        endpoint: "rate-limits/reset",
        userId: auth.userID,
        data: { targetUserId: req.userId, endpoint: req.endpoint }
      });

      await Promise.all([
        standardLimiter.reset(req.userId, req.endpoint),
        aiAnalysisLimiter.reset(req.userId, req.endpoint),
        bulkOperationLimiter.reset(req.userId, req.endpoint)
      ]);

      return {
        success: true,
        message: `Rate limits reset for user ${req.userId}${req.endpoint ? ` on endpoint ${req.endpoint}` : ''}`
      };
    } catch (error) {
      handleError(error, { service: "security", endpoint: "rate-limits/reset" });
    }
  }
);

// Security analysis endpoint
export const analyzeSecurityRisk = api<SecurityHeaders, SecurityAnalysis>(
  { expose: true, method: "POST", path: "/security/analyze" },
  async (headers) => {
    try {
      const analysis = analyzeRequest(headers);
      
      logger.info("Security analysis completed", {
        service: "security",
        endpoint: "analyze",
        data: {
          riskScore: analysis.riskScore,
          threatsCount: analysis.threats.length,
          allowRequest: analysis.allowRequest
        }
      });

      return analysis;
    } catch (error) {
      handleError(error, { service: "security", endpoint: "analyze" });
    }
  }
);

// Security middleware functions that can be used in other services
export async function applyStandardRateLimit(userId: string, endpoint: string): Promise<void> {
  await applyRateLimit(standardLimiter, userId, endpoint);
}

export async function applyAiAnalysisRateLimit(userId: string, endpoint: string): Promise<void> {
  await applyRateLimit(aiAnalysisLimiter, userId, endpoint);
}

export async function applyBulkOperationRateLimit(userId: string, endpoint: string): Promise<void> {
  await applyRateLimit(bulkOperationLimiter, userId, endpoint);
}

// Security headers middleware
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https:; frame-ancestors 'none';",
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
  };
}