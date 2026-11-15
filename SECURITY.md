# Security Policy

## Reporting a vulnerability

Email manideepdaram@gmail.com with the subject `Security report — taskflow`.
Include what you found, how to reproduce it, and the impact you believe it has.
You will get an acknowledgement within 72 hours. Please give 90 days for a fix
and coordinated disclosure before publishing.

Do not open a public issue for a vulnerability that exposes data or access.

## Scope

The deployed app (web at taskflow-web-rosy.vercel.app, API at
taskflow-api-murex.vercel.app) stores only demo data. Reports about the auth
flow, the RBAC service layer, dependencies, or the deployment pipeline are all
in scope and welcome.

## What this project does to reduce risk

- CI on every push and pull request: typecheck, tests, build
- Passwords hashed with bcrypt; JWTs expire after 7 days
- Role checks enforced in the service layer, not the controller or the UI
- `.env.example` carries placeholders only; production secrets live in Vercel, never in the repo
- Dependencies monitored with Dependabot; advisory pins documented in commit messages

## Demo constraints

The database scales to zero after inactivity. Everything in the demo is
throwaway: do not put real personal data into a TaskFlow account you create on
the public instance.
