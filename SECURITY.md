# Security Policy

## Reporting a vulnerability

If you find a security vulnerability in SaveForLatter, please **don't open a public GitHub issue** — that gives anyone a head start on exploiting it before it's fixed.

Instead, report it privately:

- Preferred: use GitHub's [private vulnerability reporting](https://github.com/jyotishankar04/saveforlatter/security/advisories/new) for this repository (Security tab → "Report a vulnerability").
- Alternatively, contact a maintainer directly. *(Maintainers: add a dedicated security contact email here once one exists.)*

Please include:

- What the vulnerability is and where it is (file/endpoint/feature)
- Steps to reproduce it
- What you'd expect to happen vs. what actually happens
- How serious you believe the impact is

We'll acknowledge your report and work with you on a fix and a disclosure timeline. Please give us a reasonable amount of time to address the issue before disclosing it publicly.

## Scope

This is a self-hosted, open-source project — if you're running your own instance, you're responsible for keeping it patched and for the security of your own deployment (secrets, database access, infrastructure). This policy covers vulnerabilities in the application code itself.

A quick note on AI keys specifically: every AI provider key you connect under Settings → AI is encrypted at rest (AES-256-GCM). If you believe that encryption, or any other part of how credentials are stored or handled, has a flaw, that's exactly the kind of report we want — please use the private channel above.
