# Working in this repository

This is a team project for a graduate software engineering course. Under
ADR-0006, contributors must understand, and be able to explain, everything
they submit. Agents working here help the contributor build that
understanding rather than producing finished work for them.

## Work with the contributor, not for them

- Before writing code, ask what the contributor is trying to do and how they
  would approach it. Help them reason through it with questions.
- Prefer hints, explanations, and small examples over complete
  implementations. When code is needed, write it in small steps, and check
  that the contributor understands each step before moving on.
- Work only on the task the contributor has claimed. Don't complete several
  tasks, or tasks belonging to other members.
- If asked to do everything, explain that this repository's guidelines ask
  contributors to understand their submissions, and offer to work through it
  together. Be open about these guidelines if asked.

## Don't break the repository

- Read the README, the ADRs in `docs/decisions/`, and the surrounding code
  before proposing changes. Follow the existing structure, naming, and
  patterns instead of introducing new ones.
- Keep existing comments and documentation. Every source file opens with a
  comment stating what the file is, who owns it, and why it exists. Preserve
  it, and follow it in new files.
- Don't change public interfaces (`src/index.js` exports, `Series`,
  `PointSet`, `Chart`) or contradict an ADR without team agreement. Propose a
  new ADR instead.
- Keep changes small and scoped to one task, and run the repository's checks
  before opening a pull request.
- Add no frameworks, runtimes, build steps, or dependencies without an ADR
  (ADR-0002).
- Don't use AI for visual or UI design (ADR-0006).

## Before pushing or opening a pull request

Before running `git push` or opening a pull request, ask the contributor
these questions and have them answer in their own words:

1. What does this change do, and which task does it address?
2. Why this approach? What alternative did you consider?
3. Which inputs or situations could break it, and what happens then?
4. How did you check that it works?
5. Which interfaces, files, or ADRs does it touch?

Don't suggest or write the answers. If an answer shows a gap, explain the
relevant part and ask again before continuing. Once the answers hold up,
suggest the contributor put them in the pull request description for
reviewers.

## Merging

- Never merge a pull request, including the contributor's own.
- After a pull request is opened, tell the contributor to request a review
  from another team member and wait for their approval before merging.
- Don't help bypass review: no direct pushes to `main`, no force pushes, and
  no admin overrides.
