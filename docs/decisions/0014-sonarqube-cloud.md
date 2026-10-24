---
status: proposed
date: 2026-10-24
decision-makers: Abdulaziz (proposed)
---

# ADR-0014: Analyze main and pull requests with SonarQube Cloud

## Context and Problem Statement

The checks catch what ESLint and the tests catch, and nothing else. Bugs,
duplicated code, security problems and untested code reach a reviewer who has
to spot them by hand. The team wants an analysis of every pull request,
reported on the pull request itself. Which analysis, and where does it run?

## Decision Drivers

* The results appear on the pull request, not only on a dashboard.
* Test coverage is part of the result, so untested changes are visible.
* Add no dependencies or build steps (ADR-0002).
* Keep the pipeline on CircleCI (ADR-0013).

## Considered Options

* ESLint and the tests only
* SonarQube Cloud automatic analysis
* SonarQube Cloud analysis from CircleCI

## Decision Outcome

Proposed option: **SonarQube Cloud analysis from CircleCI**, through
SonarSource's CircleCI orb.

Automatic analysis would need no pipeline change, but it cannot import test
coverage. So an `analyze` job runs beside `check` on every pipeline:

* It ends at once, as a success, unless the commit is on `main` or in a pull
  request. SonarQube Cloud has nowhere to report other branches, and its Free
  plan analyzes only `main` and pull requests into it.
* `npm run coverage` runs the library tests with the coverage built into
  Node's test runner, which writes `lcov.info`.
* The orb's scanner reads `sonar-project.properties` and uploads the analysis.

`sonar-project.properties` names the SonarQube Cloud organization and project,
analyzes the shipped code and the tests, and reads the coverage report. Code
that only runs in a browser (`demo/`, `benchmark/`, `src/worker.js`) is left
out of the coverage measure, since Node's tests cannot load it. `prototypes/`
stays outside the analysis, as it is outside ESLint, until it is resolved.

CircleCI sets `CIRCLE_PULL_REQUEST` when the pushed commit is in an open pull
request, and the scanner reads it to analyze the pull request against its base
instead of the branch. SonarQube Cloud posts a summary comment, inline
annotations and a check on the pull request through its GitHub App, which is
installed on the organization.

One-time setup:

1. An admin of the `cse210-team-404-not-found` organization on SonarQube
   Cloud imports this repository, which binds the project to GitHub. If the
   project key differs from `sonar-project.properties`, change the file. Turn
   off automatic analysis under Administration > Analysis Method, or the
   analysis from CircleCI is rejected.
2. Generate a personal token in SonarQube Cloud (My account > Access Tokens)
   from an account with the Execute Analysis permission, and store it as
   `SONAR_TOKEN` in a CircleCI context named `SonarCloud` (Organization
   Settings > Contexts). Tokens expire after a year at most.
3. Add a second trigger to the CircleCI project for the "PR opened" event,
   so a pull request opened after its last push is analyzed at once rather
   than on the next push.
4. After the first analysis, add SonarQube Cloud's check (`SonarCloud Code
   Analysis`) as a required status check in the `main` ruleset, if the team
   wants a failed quality gate to block merging.

### Consequences

* Good: each pull request shows its new issues, coverage on new code,
  duplication and a quality gate verdict before a person reads it.
* Good: no new dependency; coverage comes from Node's test runner.
* Neutral: `analyze` repeats `npm ci` and the library tests, a few seconds,
  so that it needs nothing from `check` and `deploy` does not wait for it.
* Neutral: a SonarQube Cloud token lives in a CircleCI context. It acts as
  the member who created it, on SonarQube Cloud only.
* Neutral: the default quality gate asks for 80% coverage on new code.
  Library changes without tests fail it, which is the point; the gate blocks
  a merge only if the team makes the check required.

## Pros and Cons of the Options

### ESLint and the tests only

* Good: nothing to set up or maintain.
* Bad: reviewers find bugs, duplication and untested code by hand, or not at
  all.

### SonarQube Cloud automatic analysis

* Good: no pipeline change; SonarQube Cloud analyzes each push and pull
  request by itself.
* Bad: no test coverage, no analysis logs, and nothing visible in CircleCI.

### SonarQube Cloud analysis from CircleCI

* Good: coverage, logs, and the analysis runs where the checks run.
* Bad: a token to store, a repeated test run, and a properties file to keep
  in step with the repository layout.
