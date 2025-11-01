import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";
import * as Sentry from "@sentry/node";

const sentryDsn = secret("SentryDSN");

let sentryInitialized = false;

function initializeSentry() {
  if (sentryInitialized) return;
  
  try {
    const dsn = sentryDsn();
    if (!dsn || dsn.trim() === "") {
      console.warn("SentryDSN not configured. Sentry monitoring is disabled.");
      return;
    }
    
    Sentry.init({
      dsn,
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
    
    sentryInitialized = true;
  } catch (err) {
    console.warn("Failed to initialize Sentry:", err);
  }
}

// API to capture exceptions manually
export const captureException = api(
  { method: "POST", path: "/monitoring/error", expose: true },
  async (req: { error: string; context?: Record<string, any> }): Promise<{ id: string }> => {
    initializeSentry();
    
    if (!sentryInitialized) {
      return { id: "sentry-not-configured" };
    }
    
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
    initializeSentry();
    
    if (!sentryInitialized) {
      return { tracked: false };
    }
    
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