// This file initializes monitoring and other services before the app starts
import { initSentry } from "./monitoring/sentry";

// Initialize Sentry early
initSentry();

console.log("SaaS Validator Suite backend initialized with monitoring");