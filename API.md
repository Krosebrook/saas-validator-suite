# SaaS Validator Suite API Documentation

The SaaS Validator Suite provides a comprehensive REST API for validating business ideas, analyzing market potential, and tracking business metrics. All endpoints require authentication unless otherwise specified.

## Authentication

The API uses Clerk for authentication. Include the authentication token in the `Authorization` header:

```
Authorization: Bearer <your-token>
```

## Base URL

All API endpoints are available at:
```
https://saas-validator-suite-d370vmc82vjsm36vu8rg.lp.dev
```

## Error Handling

The API returns structured error responses with the following format:

```json
{
  "code": "ERROR_CODE",
  "message": "Human readable error message",
  "details": {
    "field": "specific_field",
    "additional": "context"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input parameters |
| `AUTHENTICATION_ERROR` | 401 | Missing or invalid authentication |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `INSUFFICIENT_CREDITS` | 402 | Not enough credits to perform action |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `EXTERNAL_SERVICE_ERROR` | 502 | External service unavailable |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## API Endpoints

### Ideas Service

#### Create Idea

Creates a new business idea for validation.

**Endpoint:** `POST /ideas`

**Authentication:** Required

**Request Body:**
```json
{
  "title": "string (3-200 chars, required)",
  "description": "string (max 1000 chars, optional)",
  "source": "string (max 100 chars, required)",
  "source_url": "string (valid URL, optional)"
}
```

**Response:**
```json
{
  "id": 1,
  "user_id": 123,
  "title": "AI-powered task manager",
  "description": "A smart task management app that uses AI to prioritize tasks",
  "source": "personal research",
  "source_url": "https://example.com/research",
  "status": "pending",
  "created_at": "2025-01-20T10:30:00Z"
}
```

**Errors:**
- `400` - Invalid input (missing title, description too long, invalid URL)
- `402` - Insufficient credits
- `404` - User not found

---

#### List Ideas

Retrieves all ideas for the authenticated user.

**Endpoint:** `GET /ideas`

**Authentication:** Required

**Response:**
```json
{
  "ideas": [
    {
      "id": 1,
      "user_id": 123,
      "title": "AI-powered task manager",
      "description": "A smart task management app",
      "source": "personal research",
      "source_url": "https://example.com/research",
      "status": "completed",
      "created_at": "2025-01-20T10:30:00Z"
    }
  ]
}
```

---

#### Get Idea

Retrieves a specific idea by ID.

**Endpoint:** `GET /ideas/:id`

**Authentication:** Required

**Path Parameters:**
- `id` (number, required) - The idea ID

**Response:**
```json
{
  "id": 1,
  "user_id": 123,
  "title": "AI-powered task manager",
  "description": "A smart task management app",
  "source": "personal research",
  "source_url": "https://example.com/research",
  "status": "completed",
  "created_at": "2025-01-20T10:30:00Z"
}
```

**Errors:**
- `404` - Idea not found or not owned by user

---

### AI Analysis Service

#### Analyze Idea

Analyzes a business idea using AI to provide comprehensive scoring and insights.

**Endpoint:** `POST /ai/analyze`

**Authentication:** Required

**Request Body:**
```json
{
  "idea_id": 1,
  "track_type": "saas"
}
```

**Parameters:**
- `idea_id` (number, required) - The ID of the idea to analyze
- `track_type` (string, required) - Type of business track: "saas", "content", or "ecom"

**Response:**
```json
{
  "overall_score": 85,
  "market_potential": 90,
  "competition_level": 75,
  "technical_feasibility": 80,
  "monetization_potential": 85,
  "compliance_score": 95,
  "ai_analysis": "Detailed analysis text explaining the scores and providing insights...",
  "cost_estimate": {
    "infrastructure_cost": 150,
    "development_cost": 25000,
    "operational_cost": 800,
    "projected_revenue": 5000,
    "roi_estimate": 45,
    "break_even_months": 8
  }
}
```

**Errors:**
- `400` - Invalid idea ID or track type
- `404` - Idea not found or not owned by user
- `502` - AI analysis service unavailable

---

### User Profile Service

#### Get User Profile

Retrieves the current user's profile information.

**Endpoint:** `GET /users/profile`

**Authentication:** Required

**Response:**
```json
{
  "id": 123,
  "clerk_id": "user_abc123",
  "email": "user@example.com",
  "name": "John Doe",
  "credits_remaining": 25,
  "plan": "pro",
  "created_at": "2025-01-15T08:00:00Z",
  "updated_at": "2025-01-20T10:30:00Z"
}
```

---

### Compliance Service

#### Scan for Compliance Issues

Scans a business idea for potential compliance issues and regulatory concerns.

**Endpoint:** `POST /compliance/scan`

**Authentication:** Required

**Request Body:**
```json
{
  "idea_id": 1,
  "regions": ["US", "EU", "CA"]
}
```

**Parameters:**
- `idea_id` (number, required) - The ID of the idea to scan
- `regions` (array, optional) - List of regions to check compliance for

**Response:**
```json
{
  "compliance_score": 85,
  "issues": [
    {
      "severity": "medium",
      "category": "data_privacy",
      "description": "GDPR compliance required for EU users",
      "recommendation": "Implement data consent mechanisms"
    }
  ],
  "regulations": [
    {
      "name": "GDPR",
      "region": "EU",
      "applies": true,
      "description": "General Data Protection Regulation"
    }
  ]
}
```

---

### Scoring Service

#### Submit Feedback

Submits feedback on the quality of AI analysis results.

**Endpoint:** `POST /scoring/feedback`

**Authentication:** Required

**Request Body:**
```json
{
  "idea_id": 1,
  "track_type": "saas",
  "rating": 4,
  "feedback": "The analysis was helpful but could be more detailed on market sizing"
}
```

**Parameters:**
- `idea_id` (number, required) - The ID of the analyzed idea
- `track_type` (string, required) - The track type that was analyzed
- `rating` (number, required) - Rating from 1-5
- `feedback` (string, optional) - Additional feedback text

**Response:**
```json
{
  "success": true,
  "message": "Feedback submitted successfully"
}
```

---

### Monitoring Service

#### Report Error

Reports application errors for monitoring and debugging.

**Endpoint:** `POST /monitoring/error`

**Authentication:** Required

**Request Body:**
```json
{
  "error_message": "Network request failed",
  "stack_trace": "Error: Network request failed\n    at fetch...",
  "user_agent": "Mozilla/5.0...",
  "url": "/ideas/create",
  "metadata": {
    "component": "CreateIdeaDialog",
    "action": "submit"
  }
}
```

**Response:**
```json
{
  "error_id": "error_abc123",
  "success": true
}
```

## Rate Limits

The API implements rate limiting to ensure fair usage:

- **Standard endpoints:** 100 requests per minute per user
- **AI analysis endpoints:** 10 requests per minute per user
- **Bulk operations:** 5 requests per minute per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642694400
```

## SDKs and Libraries

### Frontend Integration

The API is automatically available in the frontend via the generated client:

```typescript
import backend from '~backend/client';
import { useBackend } from './hooks/useBackend';

// In a React component
const backendClient = useBackend();
const idea = await backendClient.ideas.create({
  title: "My SaaS Idea",
  source: "brainstorming"
});
```

### TypeScript Types

All API types are automatically generated and available for import:

```typescript
import type { Idea, AnalysisResult } from '~backend/ideas/types';
import type { UserProfile } from '~backend/users/types';
```

## Webhooks

The platform supports webhooks for real-time notifications of analysis completion:

**Webhook Endpoint:** `POST /webhooks/analysis-complete`

**Payload:**
```json
{
  "event": "analysis.completed",
  "idea_id": 1,
  "user_id": 123,
  "overall_score": 85,
  "timestamp": "2025-01-20T10:30:00Z"
}
```

## Support

For API support and questions:
- Documentation: [https://docs.saas-validator-suite.com](https://docs.saas-validator-suite.com)
- Email: api-support@saas-validator-suite.com
- Status Page: [https://status.saas-validator-suite.com](https://status.saas-validator-suite.com)