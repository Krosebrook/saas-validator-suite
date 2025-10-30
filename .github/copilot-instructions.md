# GitHub Copilot Instructions for SaaS Validator Suite

## Project Overview

SaaS Validator Suite is a comprehensive SaaS validation platform that helps entrepreneurs validate business ideas using AI-powered analysis, compliance scanning, and cost estimation. The platform provides multi-track scoring (SaaS, content, ecommerce), compliance checks (GDPR, HIPAA, PCI-DSS), and real-time dashboards for tracking validation metrics.

**Key Features:**
- AI-powered business idea analysis with Claude and GPT routing
- Compliance scanning for regulatory requirements
- Cost estimation with ROI analysis
- User feedback system for adaptive scoring
- Real-time dashboard for tracking metrics
- Credit-based user system with authentication

## Tech Stack

### Backend
- **Framework:** Encore.ts (TypeScript backend framework)
- **Language:** TypeScript (ES2022, strict mode enabled)
- **Database:** PostgreSQL with Encore.ts migrations
- **Authentication:** Clerk (server-side secret management)
- **AI Services:** OpenAI GPT-4 and Anthropic Claude
- **Monitoring:** Sentry for error tracking
- **Testing:** Vitest for unit and integration tests
- **Package Manager:** Bun

### Frontend
- **Framework:** React 19 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS 4.x with custom animations
- **UI Components:** Radix UI primitives with shadcn/ui
- **State Management:** TanStack React Query
- **Authentication:** Clerk React SDK
- **Routing:** React Router DOM v7
- **Testing:** Vitest with Testing Library

### Infrastructure
- **Deployment:** Encore Cloud Platform
- **CI/CD:** GitHub Actions
- **Version Control:** Git with GitHub

## Development Environment Setup

### Prerequisites
1. **Install Encore CLI:**
   - macOS: `brew install encoredev/tap/encore`
   - Linux: `curl -L https://encore.dev/install.sh | bash`
   - Windows: `iwr https://encore.dev/install.ps1 | iex`

2. **Install Bun:** `npm install -g bun`

3. **Set up environment variables:**
   - Copy `.env.example` to `.env`
   - Configure secrets using `encore secret set`:
     ```bash
     encore secret set --type dev ClerkSecretKey "your-clerk-secret-key"
     encore secret set --type dev ClerkPublishableKey "your-clerk-publishable-key"
     encore secret set --type dev SENTRY_DSN "your-sentry-dsn"
     encore secret set --type dev OPENAI_API_KEY "your-openai-key"
     encore secret set --type dev ANTHROPIC_API_KEY "your-anthropic-key"
     ```

### Running the Application

**Backend:**
```bash
cd backend
encore run
```
Backend will be available at `http://localhost:4000`

**Frontend:**
```bash
cd frontend
npm install
npx vite dev
```
Frontend will be available at `http://localhost:5173`

**Generate Frontend Client:**
```bash
cd backend
encore gen client --target leap
```

## Architecture Guidelines

### Backend Architecture
- **Service-based structure:** Each feature is organized as a separate Encore.ts service (auth, ideas, ai, compliance, scoring, users, monitoring)
- **Database migrations:** Use Encore.ts migration system for schema changes
- **API definitions:** All endpoints use Encore.ts API decorators with proper typing
- **Authentication:** Clerk authentication is enforced via middleware
- **Secrets management:** All API keys and sensitive data must use Encore.ts secrets, never hardcode
- **Error handling:** Use Encore.ts error codes (VALIDATION_ERROR, AUTHENTICATION_ERROR, etc.)
- **Monitoring:** Initialize Sentry early for error tracking with PII filtering

### Frontend Architecture
- **Component organization:** Group by feature (pages, components, hooks)
- **API integration:** Use generated Encore.ts client via `~backend/client`
- **State management:** Use React Query for server state, React hooks for local state
- **Authentication:** Use ClerkWrapper component for dynamic key fetching
- **UI components:** Use shadcn/ui components with Radix UI primitives
- **Styling:** Tailwind utility classes only, no inline styles
- **Type safety:** Import types from backend: `import type { Idea } from '~backend/ideas/types'`

### File Organization
```
backend/
  ├── auth/           # Authentication service
  ├── ideas/          # Ideas management
  ├── ai/             # AI analysis service
  ├── compliance/     # Compliance scanning
  ├── scoring/        # Scoring and feedback
  ├── users/          # User profile management
  ├── monitoring/     # Sentry integration
  ├── cache/          # Caching utilities
  ├── db/             # Database schemas and migrations
  ├── tests/          # Test files
  └── init.ts         # Application initialization

frontend/
  ├── components/     # Reusable React components
  ├── pages/          # Page components
  ├── hooks/          # Custom React hooks
  ├── lib/            # Utility functions
  └── tests/          # Frontend tests
```

## Coding Standards

### TypeScript Standards
- **Strict mode:** Always use strict TypeScript configuration
- **Type safety:** Prefer explicit types over `any`, use `unknown` for truly unknown types
- **Imports:** Use path aliases (`~encore/*`, `~backend/*`) for cleaner imports
- **Async/await:** Use async/await instead of promise chains
- **Const over let:** Prefer `const` for immutable variables
- **Naming conventions:**
  - PascalCase for components and types
  - camelCase for functions, variables, and hooks
  - UPPER_SNAKE_CASE for constants
  - Prefix custom hooks with `use`

### React Standards
- **Functional components:** Use function components with hooks, no class components
- **Hooks rules:** Follow React hooks rules (only at top level, only in React functions)
- **Component props:** Define prop types with TypeScript interfaces
- **Event handlers:** Use descriptive names (`handleSubmit`, `handleChange`)
- **Key props:** Always provide stable keys for lists
- **Avoid prop drilling:** Use React Query or context for shared state

### Encore.ts Specific
- **API definitions:** Use `api` decorator from `encore.dev/api`
- **Database access:** Use Encore.ts database utilities
- **Secrets:** Access via `encore.dev/secrets`
- **Authentication:** Use auth middleware, access user via `auth` parameter
- **Error handling:** Use `APIError` from `encore.dev/api`

### Styling Standards
- **Tailwind only:** Use Tailwind utility classes, no custom CSS except in index.css
- **Class organization:** Use `cn()` utility from `lib/utils.ts` for conditional classes
- **Responsive design:** Mobile-first approach, use `sm:`, `md:`, `lg:` breakpoints
- **Accessibility:** Include proper ARIA labels and semantic HTML
- **Component variants:** Use `class-variance-authority` for component variations

## Testing Requirements

### Test Framework
- **Test runner:** Vitest
- **Assertions:** Vitest's expect API
- **Mocking:** Vitest's `vi` utilities
- **Frontend testing:** Testing Library for React components

### Testing Standards
- **Test files:** Place test files in `tests/` directories with `.test.ts` extension
- **Setup:** Use `tests/setup.ts` for global test configuration
- **Mocking:** Mock authentication in tests via `vi.mock('~encore/auth')`
- **Test structure:** Use `describe` blocks to group related tests
- **Coverage:** Aim for meaningful tests over coverage metrics
- **Test naming:** Use descriptive test names: `it('should create an idea with valid data')`

### What to Test
- API endpoint validation and error handling
- Database operations and data integrity
- Business logic and calculations
- User authentication and authorization
- AI service integration (with mocked responses)
- Frontend component rendering and interactions
- Form validation and submission

### Running Tests
```bash
# Run all backend tests
cd backend && bun test

# Run all frontend tests
cd frontend && bun test

# Run tests in watch mode
bun test --watch

# Run with coverage
bun test --coverage
```

## Build and Deployment

### Building
```bash
# Build frontend (from backend directory)
cd backend && npm run build
```

### Deployment
- **Platform:** Encore Cloud
- **Git remote:** `encore://saas-validator-suite-aeci`
- **Deploy command:** `git push encore` or push to GitHub main branch
- **Environment secrets:** Set production secrets via `encore secret set --type prod`

### CI/CD
- GitHub Actions automatically run tests on pull requests
- Deployment to Encore Cloud happens on main branch pushes
- Preview environments are created for each pull request (Pro plan)

## Security Guidelines

### Critical Security Rules
1. **Never hardcode secrets:** Always use Encore.ts secret management
2. **PII handling:** Filter sensitive data in logs and monitoring
3. **Authentication:** Enforce Clerk authentication on all protected endpoints
4. **Input validation:** Validate all user inputs before processing
5. **SQL injection:** Use parameterized queries, never string concatenation
6. **XSS prevention:** Sanitize user-generated content before rendering
7. **CORS:** Configure proper CORS headers for API endpoints
8. **Rate limiting:** Implement rate limits on AI and resource-intensive endpoints
9. **Error messages:** Don't expose sensitive information in error messages
10. **Dependencies:** Keep dependencies updated, monitor for vulnerabilities

### Secrets Management
- Use `encore secret set` for all API keys and sensitive configuration
- Fetch Clerk publishable key dynamically via `/api/auth/clerk-config`
- Never commit secrets to version control
- Different secrets for dev/staging/prod environments

## API Documentation

- **Full API docs:** See `API.md` in repository root
- **Base URL:** `https://saas-validator-suite-d370vmc82vjsm36vu8rg.lp.dev`
- **Authentication:** Clerk token in `Authorization: Bearer <token>` header
- **Error format:** Structured JSON with `code`, `message`, `details`
- **Rate limits:** 100 req/min standard, 10 req/min for AI endpoints

## Common Tasks and Patterns

### Creating a New Service
1. Create new directory in `backend/` with service name
2. Define API endpoints using Encore.ts decorators
3. Add database migrations if needed
4. Create corresponding types
5. Add tests in `backend/tests/`
6. Update frontend client generation

### Adding a New UI Component
1. Create component in `frontend/components/`
2. Use TypeScript with proper prop types
3. Style with Tailwind classes
4. Add to relevant page in `frontend/pages/`
5. Import backend types if needed
6. Add tests if component has complex logic

### Adding a Database Migration
1. Create migration file in `backend/db/migrations/`
2. Define schema changes using Encore.ts migration syntax
3. Run migration: `encore db migrate`
4. Update types to reflect schema changes

### Integrating a New AI Feature
1. Add API key as Encore.ts secret
2. Create service function in `backend/ai/`
3. Implement error handling for external service failures
4. Add cost estimation if credits are consumed
5. Monitor with Sentry for external service errors

## Documentation Standards

- **Code comments:** Add JSDoc comments for exported functions and complex logic
- **README updates:** Update README.md for significant feature changes
- **API changes:** Update API.md when adding/modifying endpoints
- **Type documentation:** Document complex types with comments
- **Inline comments:** Use sparingly, prefer self-documenting code

## Resources

- **Encore.ts Docs:** https://encore.dev/docs
- **Encore.ts API Reference:** https://pkg.go.dev/encore.dev
- **Clerk Documentation:** https://clerk.com/docs
- **React Documentation:** https://react.dev
- **Tailwind CSS:** https://tailwindcss.com
- **Vitest:** https://vitest.dev
- **Internal Docs:**
  - `README.md` - Project overview and getting started
  - `DEVELOPMENT.md` - Detailed setup and deployment instructions
  - `API.md` - Complete API documentation
  - `SECURITY_IMPROVEMENTS.md` - Security features and best practices

## Additional Notes

- **Package manager:** Use Bun for faster package installation
- **Database:** PostgreSQL is managed by Encore.ts, no manual setup required
- **Caching:** Redis caching utilities available in `backend/cache/`
- **Logging:** Structured logging available via `backend/logging/`
- **Error tracking:** Sentry integration for production error monitoring
- **Credits system:** Users have credit-based usage limits for AI analysis
- **Multi-tenancy:** Each user has isolated data access via Clerk user ID
