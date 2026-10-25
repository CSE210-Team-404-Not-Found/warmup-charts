---
status: proposed
date: 2026-10-23
decision-makers: Abdulaziz (proposed)
---

# ADR-0013: Run the checks and the deploy on CircleCI

## Context and Problem Statement

ADR-0008 runs the linter and tests on GitHub Actions, and deploys the demo to
GitHub Pages from a second GitHub Actions workflow. The team wants its
pipeline on CircleCI. How do the checks and the deploy move, and what does
the deploy need that GitHub's own action provided for free?

## Decision Drivers

* Keep the checks themselves unchanged: `npm ci`, `npm run lint` and
  `npm test` on Node.js 22, as the README documents.
* Keep publishing the demo to GitHub Pages, at the same address.
* Add no dependencies or build steps (ADR-0002).

## Considered Options

* Keep everything on GitHub Actions
* CircleCI for the checks, GitHub Actions only for the Pages deploy
* CircleCI for the checks and the deploy, publishing a `gh-pages` branch

## Decision Outcome

Proposed option: **CircleCI for the checks and the deploy**, connected
through the CircleCI GitHub App. Supersedes ADR-0008 once accepted.

`.circleci/` replaces both GitHub Actions workflows. `config.yml` declares the
jobs, and `scripts/` holds the shell the deploy runs:

* `check` runs the checks on every push and pull request.
* `deploy` runs on `main` after `check` passes. It stages the browser assets
  as the old workflow did, commits them as the single commit of a `gh-pages`
  branch, and force-pushes that branch. GitHub Pages serves the branch.

The GitHub App integration checks code out over HTTPS and adds no SSH key,
and it does not set `CIRCLE_REPOSITORY_URL`. So the deploy job takes the
repository's owner and name from pipeline values, and pushes with a deploy
key that needs a one-time setup:

1. A GitHub organization admin connects the CircleCI GitHub App to the
   team's CircleCI organization (Organization Settings > VCS Connections)
   with access to this repository, and gives the project a GitHub App
   pipeline whose trigger runs it on every push.
2. Generate an SSH key pair. Add the public key to the repository's deploy
   keys with write access, and the private key to the CircleCI project's
   additional SSH keys for `github.com`.
3. After the first deploy creates `gh-pages`, set the repository's Pages
   source to that branch.
4. Add two rulesets. `main` requires a pull request with CircleCI's check
   passing and has no bypass, so the key cannot push to it. `gh-pages` can
   be created, updated or deleted only by the deploy key, so nobody can
   edit the published site by hand.

### Consequences

* Good: one service runs the whole pipeline, and the checks are identical
  to before.
* Good: `main` deploys only after its checks pass, as before.
* Good: the site branch holds one commit, replaced on each deploy, so it
  never grows.
* Neutral: a deploy key with write access lives in CircleCI, and nowhere
  else. The rulesets keep it off `main` and make it the only writer of
  `gh-pages`. It could still push to other branches, which only reach
  `main` through a reviewed pull request.

## Pros and Cons of the Options

### Keep everything on GitHub Actions

* Good: one service, already working.
* Rejected because the team is moving to CircleCI.

### CircleCI for the checks, GitHub Actions only for the deploy

* Good: the deploy needs no stored key.
* Bad: two services, and the deploy workflow repeats the checks.

### CircleCI for the checks and the deploy

* Good: one service, one configuration file.
* Bad: needs the deploy key, the `gh-pages` branch, and a change to the Pages
  source.
