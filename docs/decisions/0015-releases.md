---
status: proposed
date: 2026-10-24
decision-makers: Abdulaziz (proposed)
---

# ADR-0015: Version the library and generate the changelog from pull requests

## Context and Problem Statement

The project has no version, no tags and no changelog. `package.json` has no
`version` field, and nobody looking at the demo can tell which build it is.
Commit messages on feature branches follow Conventional Commits some of the
time (17 of 57 commits on `main` do), and every commit on `main` itself is a
"Merge pull request" line, so the history says nothing about what changed.
How does the team number releases, and how does a changelog get written
without anyone writing it?

## Decision Drivers

* The changelog is written once, in the pull request, and nowhere else.
* The convention is enforced by GitHub where the pull request is, not by
  reminders in review.
* Versions follow a published standard, so a number means something.
* A release goes through the `main` ruleset like any other change. Nothing
  pushes to `main` directly.
* Add no dependencies or build steps (ADR-0002). Keep the pipeline on
  CircleCI (ADR-0013).

## Considered Options

Where the convention is enforced:

* A commit message rule in the `main` ruleset
* A pull request title check on GitHub Actions
* No enforcement; non-conforming titles drop out of the changelog

What writes the changelog and bumps the version:

* release-please, through a release pull request
* git-cliff, run by hand
* semantic-release, pushing to `main`

## Decision Outcome

Proposed: **squash merges titled as Conventional Commits, a GitHub Actions
check on the title, and release-please run from CircleCI**.

### The standards

* **Conventional Commits 1.0.0** for pull request titles:
  `type(scope): subject`, scope optional. Allowed types are `feat`, `fix`,
  `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore` and
  `revert`. A breaking change carries `!` after the type or scope, or a
  `BREAKING CHANGE:` footer in the pull request description.
* **Semantic Versioning 2.0.0** for the version. `fix` bumps the patch,
  `feat` bumps the minor, a breaking change bumps the major. While the major
  is 0, a breaking change bumps the minor instead. The other types do not
  bump anything.
* **The conventional-changelog layout** for `CHANGELOG.md`: one heading per
  version with its date and a compare link, then Features, Bug Fixes and
  Performance Improvements sections listing each pull request with a link.
  `docs`, `chore`, `ci` and the rest stay out of it.

### How it fits together

1. Every pull request is squash-merged. GitHub makes the pull request title
   the commit subject and the description the commit body, so `main` holds
   one conventional commit per pull request. Commits on a branch can say
   anything.
2. A GitHub Actions workflow checks the title whenever a pull request is
   opened, edited, reopened or pushed to, and is a required check on `main`.
   A wrong title blocks the merge until it is edited. Rulesets cannot do
   this: GitHub's commit metadata rules exist only on the Enterprise plan,
   and the organization is on Free.
3. release-please runs in the `main` pipeline after every merge. It reads
   the commits since the last release and opens, or updates, a release pull
   request titled `chore(main): release X.Y.Z` that bumps the version in
   `package.json`, `package-lock.json` and `src/index.js`, and prepends the
   new section to `CHANGELOG.md`. That pull request is reviewed and merged
   like any other. On the pipeline after the merge, release-please tags the
   commit `vX.Y.Z` and publishes a GitHub Release with the same notes.
4. The version lives in the code. `src/index.js` exports `VERSION`, marked
   with release-please's `x-release-please-version` annotation so the
   release pull request rewrites it. The demo imports it and shows it in the
   page header. No build step is needed.
5. The deploy job runs on `v*` tags instead of every push to `main`, so the
   site at GitHub Pages is always a numbered release and the version in its
   header is true. Merging the release pull request is what publishes.

### Plan

GitHub settings (a repository admin):

1. Settings > General > Pull Requests: allow squash merging only, default
   commit message "Pull request title and description", automatically
   delete head branches.
2. The `main` ruleset: allowed merge methods squash only; required status
   checks "Validate PR title" (the Actions workflow) and CircleCI's check,
   which ADR-0013 step 4 planned and which is still not required. The title
   check becomes required only after the pull request below merges, because
   `pull_request_target` runs the workflow as it is on `main`.
3. A fine-grained personal access token for release-please, scoped to this
   repository with Contents and Pull requests read and write, one-year
   expiry, stored as `GITHUB_TOKEN` in a CircleCI context named `GitHub`.
   The release pull requests, tags and releases appear as that member's.

Repository changes (one pull request, titled `ci(release): ...`):

4. `package.json` gets `"version": "0.1.0"`; `npm install` carries it into
   the lockfile.
5. `src/index.js` gets `export const VERSION = "0.1.0"; // x-release-please-version`.
   `index.html` gets a place for it in the header and `demo/main.js` fills
   it.
6. `release-please-config.json`: release type `node`,
   `bump-minor-pre-major: true`, `include-component-in-tag: false`,
   `extra-files: ["src/index.js"]`, `bootstrap-sha` set to the commit `main`
   was at when this was written, so the first changelog starts after it and
   not at the old history. `.release-please-manifest.json` starts at
   `{".": "0.1.0"}`.
7. `.github/workflows/pr-title.yml`: `amannn/action-semantic-pull-request`
   on `pull_request_target` for opened, edited, reopened and synchronize,
   with the types above, `pull-requests: read` permission and nothing
   checked out.
8. `.circleci/config.yml`: a `release` job on `main` after `check` that runs
   `.circleci/scripts/release.sh`, which calls
   `npx release-please@17 github-release` and then `release-pr`, both with
   `--repo-url`, `--target-branch=main` and the token. The `deploy` job and
   the `check` job it requires get `filters: tags: only: /^v.*/`, and
   `deploy` loses its `main` branch filter.
   `halt-unless-main-or-pull-request.sh` reads `CIRCLE_BRANCH` with a
   default, since tag pipelines do not set it.
9. README: a "Releases" section in brief, and `docs/releases.md` for the
   team: how to title a pull request, what happens after a merge, how a
   release is made, and the one-time setup. The Checks section says the
   site deploys on release instead of on every merge.

First release:

10. After the setup pull request merges, tag its merge commit `v0.1.0` by
    hand and publish a GitHub Release for it. That is the baseline: the
    first deploy under the tag filter, and the point the first changelog
    compares against.
11. The next merged `feat` or `fix` makes release-please open
    `chore(main): release 0.1.1` or `0.2.0`. Merge it when the team wants
    the site updated. Reach 1.0.0 by putting `Release-As: 1.0.0` in a pull
    request description once the exports in `src/index.js` are declared
    stable.

### Consequences

* Good: the changelog and the version come from the pull request titles the
  team writes anyway, and a bad title cannot reach `main`.
* Good: a release is a reviewed pull request, so the `main` ruleset keeps
  its no-bypass rule and nothing holds a token that can push to `main`.
* Good: no dependency is added. release-please is fetched by `npx` in the
  pipeline, like the SonarQube orb is fetched by CircleCI.
* Neutral: one small workflow returns to GitHub Actions after ADR-0013
  removed them. It must live there, because it reacts to a title edit,
  which is a GitHub event CircleCI never sees. It checks out nothing and
  runs in seconds.
* Neutral: the site no longer updates on every merge to `main`. Updating it
  is a decision: merge the release pull request.
* Neutral: a second token lives in a CircleCI context, like the SonarQube
  one. It acts as the member who created it and expires after a year.
* Bad: the release pull request can conflict when `CHANGELOG.md` or the
  version is edited by hand in the meantime. Nobody edits those by hand.
* Bad: a merge that mixes a feature and a fix under one title appears once,
  under that title. Split the pull request or accept the single line.

## Pros and Cons of the Options

### A commit message rule in the `main` ruleset

* Good: no workflow, no token; GitHub refuses the merge itself.
* Bad: available on GitHub Enterprise only. The organization is on Free.

### A pull request title check on GitHub Actions

* Good: checks the one string that becomes the commit subject, reruns when
  the title is edited, and the ruleset makes it blocking.
* Bad: a workflow file on GitHub Actions beside the CircleCI pipeline.

### No enforcement

* Good: nothing to set up.
* Bad: a mistyped title silently drops a change from the changelog and the
  version bump; the mistake is found at release time, if at all.

### release-please

* Good: the release is a pull request, so it works under the ruleset; it
  computes the version, writes the changelog, tags and publishes the
  release; it updates the version string in arbitrary files.
* Bad: a token with pull request and contents access in CircleCI; the
  first run needs a baseline tag and a bootstrap commit.

### git-cliff

* Good: a single binary, no npm at all; its templates can produce the
  Keep a Changelog layout if the team prefers it.
* Bad: it only writes the file. Someone bumps the version, opens the pull
  request, tags and publishes by hand every time.

### semantic-release

* Good: fully automatic from a merge to a published release.
* Bad: it commits the changelog and the tag straight to `main`, which the
  ruleset forbids with no bypass; a large plugin set to configure.
