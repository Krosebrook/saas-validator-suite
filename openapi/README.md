# OpenAPI Documentation

This directory contains the auto-generated OpenAPI specification for the API.

## Accessing the API Documentation

### Development
The Swagger UI is available at:
```
http://localhost:4000/docs
```

### Production
OpenAPI documentation is disabled in production for security reasons.

## Generating the Spec

The OpenAPI spec is automatically generated from TypeScript types and Encore.ts API definitions.

To regenerate manually:
```bash
encore api openapi > openapi/openapi.json
```

## Linting the Spec

Use Spectral to lint the OpenAPI specification:

```bash
npx @stoplight/spectral-cli lint openapi/openapi.json
```

## Using the Spec

### With Client Generators
Generate API clients from the spec:

```bash
# TypeScript/JavaScript
npx @openapitools/openapi-generator-cli generate \
  -i openapi/openapi.json \
  -g typescript-fetch \
  -o client/

# Python
openapi-generator generate \
  -i openapi/openapi.json \
  -g python \
  -o client-python/
```

### With Testing Tools
Import the spec into tools like Postman, Insomnia, or Paw for API testing.

### With Documentation Sites
Host the spec with tools like:
- Redoc
- SwaggerUI
- Stoplight Elements

## Endpoints

All API endpoints are automatically documented, including:

- **Scraper** - `/scraper/*` - Multi-source idea scraping
- **Enrichment** - `/enrichment/*` - Content enrichment pipeline
- **Validation** - `/validation/*` - 8-dimension validation scoring
- **Compose** - `/compose/*` - PDF/one-pager generation
- **Compare** - `/compare/*` - Idea comparison matrix
- **Gamify** - `/gamify/*` - Leaderboards and achievements
- **Integrations** - `/integrations/*` - Webhooks (Zapier, n8n, Slack)
- **Syncs** - `/syncs/*` - Notion bi-directional sync
- **Imports** - `/imports/*` - Bulk CSV/JSONL import
- **Digests** - `/digests/*` - Weekly digest emails
- **Perf** - `/perf/*` - Core Web Vitals tracking
