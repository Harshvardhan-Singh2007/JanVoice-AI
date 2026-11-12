# Startup Buildathon India 2026: presentation outline

Use this outline for an 8-part product presentation. No traction, partnership, accuracy, or outcome metrics are included because none have been validated in this project.

## 1. Problem

- Civic concerns can be hard to turn into a clear, structured digital report.
- After submitting a report, a person may need a clear way to review its recorded status.
- Frame these as the problem JAN Voice AI is designed to explore, not as quantified research findings.

## 2. Why current reporting can be insufficient

- Reporting flows may not fit every person or situation: typing, language, context, and follow-up can create friction.
- A submission form alone does not necessarily give the reporter visibility into later workflow changes.
- Avoid claiming that all current government channels fail; acknowledge that JAN Voice AI is not integrated with them.

## 3. JAN Voice AI solution

- A web prototype for citizen report submission and staff workflow within one application.
- Text, optional image, editable browser speech transcript, and optional GPS.
- Citizen report list, persisted status history, and updates.
- State clearly: no municipality, government service, or emergency service receives reports from this prototype.

## 4. Live product workflow

- Show a synthetic report from entry through citizen submission.
- Show AI suggestions for review, then the saved report and current workflow status.
- With pre-provisioned staging roles, show Admin department assignment and Authority status/remarks updates.
- Return to the Citizen account and refresh the saved timeline/notifications.

## 5. AI-powered civic intelligence and duplicate detection

- Gemini returns structured category, department, priority, summary, language, and explanation suggestions.
- Citizens review, edit, accept, or reject suggestions. They remain advisory and can be skipped.
- Similar-report detection uses text/category and geographic proximity when coordinates exist.
- Duplicate matches are warnings with references. The system does not auto-merge, hide, or reject reports.
- Do not claim AI accuracy; propose a future evaluation with consented, representative data.

## 6. Technical architecture

- React, TypeScript, Vite frontend; Node.js, Express, TypeScript API.
- MongoDB/Mongoose as the complaint and update source of truth.
- JWT authentication and backend role, ownership, and department checks.
- Backend-only Gemini and Cloudinary credentials; optional OpenStreetMap tile use.
- Show the architecture diagram in the repository README if a diagram slide is useful.

## 7. Privacy and security

- GPS requires an explicit user action and is optional. Mapped coordinates are approximate.
- Browser voice input adds an editable transcript; the app does not upload or store raw audio recordings.
- Staff report views omit reporter account identity. Do not show personal test data on stage.
- AI is not an official decision. Duplicate warnings do not determine complaint acceptance.
- Registration creates Citizen accounts only; Admin and Authority demo accounts are provisioned separately in isolated staging.
- Use synthetic reports and accounts in the presentation.

## 8. Future scope and impact measurement

- Explore consented pilots with civic organizations or public-service partners; no partnership currently exists.
- Add a secure staff provisioning and password-recovery process.
- Test accessibility, language quality, duplicate-warning precision/recall, report completion, and follow-up comprehension with participants.
- Establish baselines and evaluation methods before presenting impact numbers.
- Consider a reviewed external delivery integration only with an accountable partner and receipt/status contracts.
