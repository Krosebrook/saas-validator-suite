import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";
import * as Sentry from "@sentry/node";

const sentryDsn = secret("SentryDSN");

Sentry.init({
  dsn: sentryDsn(),
  tracesSampleRate: 1.0,
  sendDefaultPii: true,
  environment: process.env.NODE_ENV || "development",
  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
    }
    return event;
  },
});

// API to capture exceptions manually
export const captureException = api(
  { method: "POST", path: "/monitoring/error", expose: true },
  async (req: { error: string; context?: Record<string, any> }): Promise<{ id: string }> => {
    const eventId = Sentry.captureException(new Error(req.error), {
      extra: req.context,
    });
    
    return { id: eventId };
  }
);

// Health check endpoint
export const healthCheck = api(
  { method: "GET", path: "/monitoring/health", expose: true },
  async (): Promise<{ status: string; timestamp: string }> => {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
    };
  }
);

// Performance monitoring
export const trackPerformance = api(
  { method: "POST", path: "/monitoring/performance", expose: true },
  async (req: { 
    operation: string; 
    duration: number; 
    metadata?: Record<string, any> 
  }): Promise<{ tracked: boolean }> => {
    Sentry.addBreadcrumb({
      message: `Performance: ${req.operation}`,
      level: 'info',
      data: {
        duration: req.duration,
        ...req.metadata,
      },
    });

    // Track slow operations
    if (req.duration > 5000) { // 5 seconds
      Sentry.captureMessage(`Slow operation detected: ${req.operation}`, 'warning');
    }

    return { tracked: true };
  }
);