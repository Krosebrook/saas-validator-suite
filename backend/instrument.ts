import * as Sentry from "@sentry/node";

let initialized = false;

export function initSentry(dsn: string) {
  if (initialized) return;
  
  try {
    if (dsn && dsn.trim() !== "") {
      Sentry.init({
        dsn,
        tracesSampleRate: 1.0,
        sendDefaultPii: true,
        environment: process.env.ENCORE_ENVIRONMENT || "development",
        beforeSend(event) {
          if (event.request?.headers) {
            delete event.request.headers.authorization;
            delete event.request.headers.cookie;
          }
          return event;
        },
      });
      initialized = true;
      console.log("Sentry initialized successfully");
    } else {
      console.warn("SentryDSN not configured. Sentry monitoring is disabled.");
    }
  } catch (err) {
    console.warn("Failed to initialize Sentry:", err);
  }
}

export default Sentry;
