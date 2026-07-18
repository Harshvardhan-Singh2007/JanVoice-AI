# JanVoice AI Development Roadmap

## Phase 1 — Foundation

- Define design tokens, accessibility standards, and responsive layout primitives.
- Add application routes and page shells.
- Establish API conventions, error handling, logging, and validation.
- Configure MongoDB Atlas connection and data models.

## Phase 2 — Identity and Reporting

- Implement JWT authentication and authorization roles.
- Build issue creation, media upload through Cloudinary, and issue lifecycle APIs.
- Build reporting, issue-detail, and user dashboard experiences.

## Phase 3 — Location and Intelligence

- Integrate Google Maps for map selection, geocoding, and issue visualization.
- Integrate OpenAI for issue categorization, summarization, and duplicate detection.
- Add human-review controls and audit logging for AI-assisted actions.

## Phase 4 — Operations

- Create municipal workflows, assignments, updates, and notifications.
- Add analytics, moderation, rate limits, observability, tests, CI/CD, and security hardening.

## Initial Architecture

```text
frontend/        React client application
backend/         Express service
docs/            Product and engineering documentation
```

Each workspace owns its runtime configuration. Keep secrets out of source control and use managed credentials in deployment environments.
