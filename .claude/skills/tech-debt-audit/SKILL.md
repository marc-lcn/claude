---
name: tech-debt-audit
description: Thorough, user-invoked tech debt and architecture audit of the current codebase. Produces TECH_DEBT_AUDIT.md with file-cited findings, severity, effort estimates, and a required "looks bad but is actually fine" section. Use when the user asks for a debt audit, codebase health check, architecture review, or code quality assessment of an entire repo. Does not auto-invoke.
disable-model-invocation: true
---

## Operating principles

The skill finds actual problems through grounded analysis rather than generic pattern-matching. Every concrete finding requires a `file:line` citation. Vague claims about code quality are rejected unless anchored to specific locations in the codebase.

## Phase 1: Orient

Mandatory initial phase covering repository fundamentals, directory mapping, git history analysis, identification of entry points and hot paths, detection of largest files and high-churn locations, and publication of an audit plan. Produces a 1–2 paragraph architectural mental model before proceeding to detailed analysis.

## Phase 2: Audit across nine dimensions

1. Architectural decay (circular dependencies, layering violations, god files/functions, duplicated logic, unused abstractions, dead code)
2. Consistency rot (multiple implementations of same patterns, naming drift, folder structure misalignment)
3. Type & contract debt (loose typing, untyped API boundaries, missing schema validation)
4. Test debt (coverage gaps, implementation-focused assertions, skipped/flaky tests)
5. Dependency & config debt (security vulnerabilities, unused/duplicate dependencies, environment variable sprawl)
6. Performance & resource hygiene (N+1 queries, blocking I/O on hot paths, uncleaned resources)
7. Error handling & observability (swallowed exceptions, inconsistent error shapes, missing structured logs)
8. Security hygiene (hardcoded secrets, SQL injection patterns, weak authentication)
9. Documentation drift (README inaccuracy, contradictory comments, missing docstrings)

## Phase 3: Deliverable structure

Output file: `TECH_DEBT_AUDIT.md` containing executive summary, architectural mental model, findings table (ID | Category | File:Line | Severity | Effort | Description | Recommendation), top 5 priority fixes with concrete refactor sketches, quick wins checklist, required "looks bad but is actually fine" section, and open questions.

## Rules

Every concrete finding requires `file:line` citation. Uncertain findings go to open questions rather than assertions. Recommendations are specific and scoped, never wholesale rewrites. Empty categories state "Nothing material." Required sections include the "looks bad but is actually fine" analysis—if empty, the audit was insufficiently thorough.

## Stack-specific tooling

TypeScript/JavaScript: `npm audit`, `npx knip`, `npx madge`, `npx depcheck`, `tsc --noEmit`

Python: `pip-audit`, `ruff check`, `vulture`, `pydeps`, `mypy --strict`

Rust: `cargo audit`, `cargo udeps`, `cargo machete`, `cargo clippy`

Go: `govulncheck`, `go vet`, `staticcheck`, `golangci-lint`

## Large repo handling

Repositories exceeding 50k lines or 5 top-level modules dispatch parallel subagents per module, each producing up to 200 findings. Main agent synthesizes, deduplicates, and ranks results.

## Repeat-run mode

If prior audit exists, read it first. Mark resolved findings as RESOLVED, update stale entries, tag new findings NEW. Transforms audit into living document tracking change over time.
