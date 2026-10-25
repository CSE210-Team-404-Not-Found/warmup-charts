# Releases

How a change becomes a numbered release of Warmup Charts, and what each
person does along the way. The decision behind it is ADR-0015.

In one paragraph: every pull request is squash-merged under a Conventional
Commit title. After each merge, release-please keeps one release pull request
open on `main` that bumps the version and writes the changelog from those
titles. Merging the release pull request is the release: the commit is tagged
`vX.Y.Z`, a GitHub Release is published with the same notes, and the tag
deploys the site.

## Titling a pull request

The title becomes the commit on `main` and a line in the changelog, so it is
the one thing to get right. The format is `type(scope): subject`. The scope is
optional and names the area, such as `chart`, `data`, `demo`, `ci` or `docs`.
The subject says what the change does, in the imperative, without a trailing
period.

| Type | Use it for | Effect on the version |
|---|---|---|
| `feat` | A new capability a user or a caller can see | Minor bump |
| `fix` | A bug fix | Patch bump |
| `perf` | A speed-up with no behaviour change | Patch bump |
| `refactor` | Restructuring with no behaviour change | None |
| `test` | Tests only | None |
| `docs` | Documentation only, ADRs included | None |
| `style` | Formatting only | None |
| `build` | `package.json`, lockfile, npm scripts | None |
| `ci` | CircleCI, GitHub workflows, release tooling | None |
| `chore` | Anything else that is not code a user runs | None |
| `revert` | Reverting an earlier change | Patch bump |

Examples that pass: `feat(chart): add a log scale`, `fix(data): keep rows
with a trailing comma`, `docs: record the release process`.

Examples that fail: `Add log scale` (no type), `Feat: log scale` (type is
case-sensitive), `feat(chart) add log scale` (missing colon), `Ci/releases`
(GitHub's default title from a branch name).

A breaking change, meaning something a caller of `src/index.js` has to
change, gets a `!` after the type or scope, as in `feat(chart)!: rename
showLine to line`, or a `BREAKING CHANGE: ...` footer as the last paragraph
of the description. Either one bumps the minor version while the major is 0,
and the major once it is 1.

GitHub runs the check "Validate PR title" when a pull request is opened,
retitled or pushed to. A failing title blocks the merge button. Edit the title
and the check reruns within a minute. Nothing about the branch's own commits
matters; they are squashed away.

When merging, keep "Squash and merge" and leave the suggested message as it
is: GitHub fills in the title as the subject and the description as the body.
Footers in the description, such as `BREAKING CHANGE:` or `Release-As:`, travel
with the commit this way.

## What happens after a merge

CircleCI runs the checks and the Sonar analysis as before, then the `release`
job. It runs release-please twice:

1. `github-release` looks for a release pull request that was just merged. If
   it finds one, it tags that commit, publishes the GitHub Release and marks
   the pull request `autorelease: tagged`. Otherwise it does nothing.
2. `release-pr` reads every commit on `main` since the last tag. If any of
   them is a `feat`, `fix`, `perf`, `revert` or breaking change, it opens the
   release pull request, or rewrites the one already open. Merges of `docs`,
   `chore`, `ci` and the other silent types alone produce no pull request.

The release pull request is titled `chore(main): release X.Y.Z`, comes from
the branch `release-please--branches--main`, carries the label
`autorelease: pending`, and changes exactly four files: the version in
`package.json`, `package-lock.json` and `src/index.js`, and a new section at
the top of `CHANGELOG.md`. There is never more than one open at a time. Each
later merge to `main` updates it in place, so it can sit open for a week and
collect that week's changes.

Nobody edits `CHANGELOG.md` or those version strings by hand. The next run
would overwrite the edit, and a hand edit on `main` makes the release pull
request conflict.

## Making a release

1. Open the release pull request and read the changelog section. It is the
   release notes. If a line is wrong, the fix is in the original pull request
   it came from, not here: edit that merged pull request's description and add
   a paragraph wrapped in `BEGIN_COMMIT_OVERRIDE` and `END_COMMIT_OVERRIDE`
   lines containing the corrected title. The next pipeline on `main` rewrites
   the release pull request from it.
2. Review and squash-merge it like any other pull request. It needs the same
   approval.
3. Wait for the `main` pipeline. Its `release` job tags the merge commit
   `vX.Y.Z` and publishes the GitHub Release.
4. The tag starts a second pipeline that runs `check` and `deploy`. A few
   minutes later the site shows the new version in its header.

Releasing is a decision, not an automatic event. Merging the release pull
request after every feature gives a release per feature; leaving it open gives
a release with a longer changelog. Until it is merged, `main` is checked but
not deployed.

To release a specific version, for example 1.0.0 once the exports in
`src/index.js` are declared stable, put `Release-As: 1.0.0` as a footer in the
description of any pull request merged to `main`. The release pull request
takes that version instead of the computed one.

## Version rules

Semantic Versioning 2.0.0, read from the merged titles:

| Change | Below 1.0.0 | From 1.0.0 |
|---|---|---|
| `fix`, `perf`, `revert` | Patch | Patch |
| `feat` | Minor | Minor |
| Breaking change | Minor | Major |

Only the highest bump among the collected changes applies. The version starts
at 0.1.0. Tags are `vX.Y.Z`, and the GitHub Release of each tag carries the
same notes as `CHANGELOG.md`.

## One-time setup

For a repository admin, in this order, after the pull request adding the
tooling is merged:

1. Settings > General > Pull Requests: allow squash merging only, with the
   default message "Pull request title and description". Turn on
   "Automatically delete head branches".
2. Settings > Rules > Rulesets > `main`: set the allowed merge methods to
   squash only, and add the required status checks "Validate PR title" and
   CircleCI's check.
3. Create a fine-grained personal access token for this repository with
   Contents and Pull requests set to read and write, expiring in one year.
   In CircleCI, Organization Settings > Contexts, create a context named
   `GitHub` with the variable `GITHUB_TOKEN` holding it. The release pull
   requests, tags and releases appear as the member who made the token, and
   that member cannot approve the release pull request alone.
4. Tag the merge commit of the tooling pull request as the baseline, with a
   release so the changelog's compare links resolve:

   ```sh
   gh release create v0.1.0 --target <merge commit> --title v0.1.0 --notes "Baseline for release-please. Later releases list their changes here."
   ```

   The tag runs the first deploy under the new filter, and the header of the
   site reads v0.1.0.
5. Merge any `feat` or `fix` and confirm a release pull request appears within
   a few minutes of the `main` pipeline finishing.

When the token expires, the `release` job fails with an authentication error
until a new token replaces the variable in the `GitHub` context.

## When something looks wrong

* **No release pull request after a merge.** The merged titles since the last
  tag are all silent types. Check the title of the merged pull request; if it
  should have been a `feat` or `fix`, use the override described under Making
  a release.
* **"Validate PR title" fails.** The title does not match the format or uses a
  type not in the table. Edit the title.
* **The `release` job fails with 401 or 403.** The token in the `GitHub`
  context expired or lost a permission. Replace it.
* **The release pull request has conflicts.** Someone edited `CHANGELOG.md`
  or a version string on `main` by hand. Revert that edit and the next run
  rewrites the pull request.
* **A tag exists but the site did not change.** Open the tag's pipeline in
  CircleCI. `check` or `deploy` failed there, or the tag does not start with
  `v`. If no pipeline exists for the tag, the project's "All pushes" trigger
  did not cover it: add a "Tag pushes" trigger in Project Settings > Project
  Setup.
* **The tag exists but there is no GitHub Release.** The `github-release`
  step did not run after the merge. Rerun the `release` job on the `main`
  pipeline; both commands are safe to run again.
