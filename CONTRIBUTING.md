# Contributing to SolarAgent Pro

Thanks for looking at this project. It currently runs on a solo-developer + AI-assistant
workflow (see `docs/SolarAgent_Pro_SRS_Week1.docx`, Section 1.6), but is set up the way a
small team project would be so it's easy to open up to collaborators.

## Before you start

1. Read `README.md` — it covers setup, architecture, and what's genuinely production-ready
   vs. what still needs work.
2. Check `docs/initial_task_list.md` for open items, or open an issue for anything not
   already listed.

## Branching

This repo uses **GitHub Flow**, not GitFlow:

- `main` is always in a runnable state.
- Cut a branch per change: `feature/<short-description>` or `fix/<short-description>`.
- Open a Pull Request back into `main` — even for solo work, this keeps a reviewable
  history of *why* a change was made, not just *what* changed.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/): `<type>: <short imperative description>`

| Type | Use for |
|---|---|
| `feat:` | a new capability |
| `fix:` | a bug fix |
| `docs:` | documentation only |
| `refactor:` | code change with no behavior change |
| `test:` | adding or updating tests |
| `chore:` | tooling, dependencies, config |

Example: `feat: add battery sizing to energy engine`

## Before opening a PR

- [ ] Run the relevant app locally and confirm it still works (see README "Quick start").
- [ ] If you added an environment variable, document it in the matching `.env.example`.
- [ ] If behavior changed, update `README.md` and/or the SRS so docs stay accurate.
- [ ] **Project-specific rule:** any new number the user can see must come from a function
      in `backend/app/engines/`, never from unvalidated model output. If you're touching
      the agent, this means adding a new *tool* the model can call — not asking the model
      to produce the number itself. See the SRS, Section 2.2.5, and `FR-7`.
- [ ] Fill in the PR template checklist (auto-populated when you open a PR).

## Code style

- **Python (backend):** standard library formatting conventions; keep engine functions
  pure (same input → same output, no hidden state) so they stay independently testable.
- **JavaScript/React (frontend):** functional components with hooks; colors and fonts
  come from the design tokens in `tailwind.config.js` — avoid introducing one-off hex
  values in components.

## Reporting a bug or requesting a feature

Open a GitHub Issue with:
- What you expected vs. what happened (for bugs), or the use case (for features)
- Steps to reproduce, if applicable
- Which part of the system it touches (backend engine, agent, frontend, docs)

## Code of conduct

Be direct, be kind, assume good faith. Disagree about the code, not the person.
