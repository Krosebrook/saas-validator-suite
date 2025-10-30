# SaaS Validator Suite

A comprehensive SaaS validation platform with AI-powered analysis, compliance scanning, and cost estimation.

## Features

- **Idea Management**: Add and track SaaS ideas from multiple sources
- **AI-Powered Analysis**: Multi-track scoring with Claude and GPT routing
- **Compliance Scanning**: GDPR, HIPAA, and PCI-DSS compliance checks
- **Cost Estimation**: Infrastructure, development, and ROI analysis
- **User Feedback**: Adaptive scoring based on user feedback
- **Real-time Dashboard**: Track validation metrics and insights

## Tech Stack

- **Backend**: Encore.ts with TypeScript
- **Frontend**: React with TypeScript, Tailwind CSS, shadcn/ui
- **Database**: PostgreSQL with migrations
- **Authentication**: Clerk
- **AI**: OpenAI GPT-4 and Anthropic Claude
- **Testing**: Vitest for unit and integration tests
- **CI/CD**: GitHub Actions

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Copy `.env.example` to `.env` and fill in your API keys:
   - Clerk Secret Key
   - OpenAI API Key
   - Anthropic API Key

3. **Configure Clerk**:
   Update `frontend/config.ts` with your Clerk publishable key

4. **Run the application**:
   ```bash
   encore run
   ```

5. **Access the app**:
   - Backend: `http://localhost:4000`
   - Frontend: `http://localhost:3000`

## API Endpoints

### Ideas
- `POST /ideas` - Create a new idea
- `GET /ideas` - List user's ideas
- `GET /ideas/:id` - Get idea details

### AI Analysis
- `POST /ai/analyze` - Analyze idea with AI

### Compliance
- `POST /compliance/scan` - Scan for compliance issues

### Scoring
- `POST /scoring/feedback` - Submit user feedback

## Database Schema

The application uses PostgreSQL with the following main tables:
- `users` - User profiles and credits
- `ideas` - SaaS ideas and metadata
- `scores` - AI analysis scores
- `cost_estimates` - Financial projections
- `user_feedback` - User feedback for adaptive scoring
- `compliance_scans` - Compliance scan results

## Testing

```bash
# Run all tests
npm test

# Run backend tests
npm run test:backend

# Run frontend tests
npm run test:frontend
```

## Deployment

The application is configured for deployment with Encore.ts:

1. Push to the `main` branch
2. GitHub Actions will run tests and deploy automatically
3. Set up secrets in GitHub Actions:
   - `ENCORE_TOKEN`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details
