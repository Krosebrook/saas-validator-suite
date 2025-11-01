import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";
import Sentry, { initSentry } from "../instrument";

const sentryDsn = secret("SentryDSN");

let sentryInitialized = false;

function ensureSentryInit() {
  if (sentryInitialized) return;
  
  try {
    const dsn = sentryDsn();
    initSentry(dsn);
    sentryInitialized = true;
  } catch (err) {
    console.warn("Sentry initialization skipped:", err);
  }
}

export const captureException = api(
  { method: "POST", path: "/monitoring/error", expose: true },
  async (req: { error: string; context?: Record<string, any> }): Promise<{ id: string }> => {
    ensureSentryInit();
    
    const eventId = Sentry.captureException(new Error(req.error), {
      extra: req.context,
    });
    
    return { id: eventId };
  }
);

export const healthCheck = api(
  { method: "GET", path: "/monitoring/health", expose: true },
  async (): Promise<{ status: string; timestamp: string }> => {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
    };
  }
);

export const trackPerformance = api(
  { method: "POST", path: "/monitoring/performance", expose: true },
  async (req: { 
    operation: string; 
    duration: number; 
    metadata?: Record<string, any> 
  }): Promise<{ tracked: boolean }> => {
    ensureSentryInit();
    
    Sentry.addBreadcrumb({
      message: `Performance: ${req.operation}`,
      level: 'info',
      data: {
        duration: req.duration,
        ...req.metadata,
      },
    });

    if (req.duration > 5000) {
      Sentry.captureMessage(`Slow operation detected: ${req.operation}`, 'warning');
    }

    return { tracked: true };
  }
);
