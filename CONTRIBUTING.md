# Team 404 Not Found Policies

This document describes the team's standards for GitHub collaboration, code,
and repository README files.

## GitHub Practices

### Issues

Before coding begins on a project, we meet as a team to discuss the initial tasks
and tests. Then, we will create and assign GitHub issues together. Each issue should include
a clear description, the expected outcome, and the criteria for considering it
finished.

### Pull requests

- Link the relevant issue in each pull request.
- Get reviews from at least one other team member before merging.
- Pass all tests and resolve review comments before merging.
- Explain in the pull request description if the implementation differs from
  the original issue.

### Commit messages

Use this format:

```text
<type>(<scope>): <short summary>
```

Supported types are `feat`, `fix`, `refactor`, `test`, `ci`, `build`, and
`docs`. Use a scope that identifies the affected folder or file when it is
applicable and makes sense.

### Branch names

Include your name, the GitHub issue number, and a short task title:

```text
<name>/<issue-number>-<short-title>
```

For example: `loisel/13-contributing-md` as Loisel created this branch, linked to github issue #13, tasked with creating the contributing.md file. 

### Merging

After the pull request is reviewed, its author is responsible for merging it
and resolving conflicts. Communicate with the team when work affects others or
when you are unsure how to resolve a conflict. Overcommunicating is better than
undercommunicating.

## Code Standards

### Documentation

Use JSDoc to document substantial functions. Add concise inline comments when
they clarify the code. For small or self-explanatory functions, a short `//`
comment is sufficient when a comment is useful.

```js
/**
 * Description of the function.
 *
 * @param {type} variableName - Description of the parameter.
 * @returns {type} Description of the return value.
 */
```

### Naming and code quality

- Use `lowerCamelCase` for functions and variables.
- Use `UPPER_SNAKE_CASE` for global constants.
- Choose descriptive names; avoid unexplained abbreviations and unconventional
  single-letter names.
- Keep functions focused on one responsibility when practical.
- Handle expected errors explicitly rather than failing silently.
- Do not add dependencies unless the team agrees to them.

### Repository Tools/Checks on Code

This repository uses ESLint and a pre-commit git hook with Husky to check that code meets our standards before allowing commits. 

## Development Tools

### CircleCI 

CircleCI is used to build and deploy onto Github Pages.

### SonarQube

SonarQube is used to check security hotspots and test coverage on new code.

## Repository README

Structure the repository's README with these sections:

1. Project overview
2. Demo
3. Prerequisites and setup
4. Features and important APIs
5. Repository structure
6. Testing and contribution guidelines
