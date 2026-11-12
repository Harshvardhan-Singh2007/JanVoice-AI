# JAN Voice AI development roadmap

This roadmap distinguishes implemented prototype work from future scope. It does not describe an active government partnership or deployed service.

## Implemented prototype capabilities

- React/TypeScript/Vite frontend and Express/TypeScript backend.
- JWT-authenticated Citizen, Authority, and Admin role workflows. Public registration creates Citizen accounts only.
- MongoDB/Mongoose complaint storage, citizen ownership checks, staff department scope, bounded pagination, and complaint update history.
- Optional backend Gemini analysis with structured response validation, receipt verification, and citizen review state.
- Optional Cloudinary image upload with content validation.
- Browser speech-to-text transcript, explicit optional geolocation sharing, approximate OSM-based map display, and heuristic possible-duplicate warnings.
- Admin department assignment, staff status/remarks workflow, and persisted citizen updates.
- Automated backend/frontend tests and workspace type/lint/build scripts.

## Buildathon readiness work

- Public copy describes prototype behavior and no external government delivery channel.
- Dashboard actions link to implemented routes or are labeled planned.
- Demo setup and presentation materials use isolated staging data and make no unsupported impact claims.
- Production deployment and live-service verification are not included.

## Future scope

- User research and measured accessibility/usability evaluation.
- Secure staff account provisioning and configured password recovery.
- Language/localization and AI/duplicate-detection evaluation on representative consented data.
- Operational monitoring, shared rate limits, CI/CD, and production hosting configuration.
- Any public-service integration only with an accountable partner and explicit delivery/status contracts.
