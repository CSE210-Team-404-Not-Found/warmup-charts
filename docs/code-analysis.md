# Code analysis: SonarQube Cloud and eslint-plugin-sonarjs

What each tool finds in this repository, what each costs, and which
code-smell rules the ESLint config now carries. Written for issue #9.

## What was run

* **SonarQube Cloud**, from the CircleCI `analyze` job (ADR-0014), with the
  default "Sonar way" quality profile. The results are from the analysis of
  `main` at 648543b on 2026-10-25, test coverage included.
* **eslint-plugin-sonarjs 4.2.2** on ESLint 10.12 with its `recommended`
  configuration, 230 of its 295 rules on, run locally against the same code
  on 2026-10-24. Nothing from that run was committed.

Both read `src/`, `demo/`, `benchmark/` and `test/`. SonarQube Cloud also
reads `index.html` and `style.css`, which ESLint cannot.

## Findings

| Finding | SonarQube Cloud | sonarjs |
|---|---|---|
| `src/worker.js:12` accepts messages without checking their origin (S2819, vulnerability, critical) | yes | no |
| `demo/main.js:89` and `:104` promises neither awaited nor given a rejection handler (S9383, bug) | yes | no |
| `index.html:67` heading with no content for a screen reader (S6850) | yes | no |
| `benchmark/benchmark.js:70` regular expression with super-linear runtime (S8786, `super-linear-regex`) | yes | yes |
| `benchmark/benchmark.js:94` `Math.random()` (`pseudo-random`) | no | yes |
| `src/data.js:57`, `src/render-scheduler.js:154`, `benchmark/benchmark.js:324` cognitive complexity above 15 (`cognitive-complexity`) | no | yes |
| `src/chart.js:630` negated condition that reads better inverted (`no-inverted-boolean-check`) | no | yes |

Five findings from SonarQube Cloud, six from sonarjs, one in common. No
security hotspots, no duplicated code, quality gate passing, coverage 48%.

On security, which the issue singles out, SonarQube Cloud found the one
finding that matters: the worker handles messages from any origin. The
sonarjs `recommended` run did not report it. Its own security hit,
`Math.random()`, is in the benchmark's data generator, where randomness is
not a security property. The rest of what sonarjs adds is maintainability:
three functions it rates too complex and one condition it would write the
other way round.

## What each tool covers

| | SonarQube Cloud | eslint-plugin-sonarjs |
|---|---|---|
| Where results show | Pull request comment and check, dashboard | Editor and `npm run lint` |
| When | After the push, in the CircleCI pipeline | While typing, before the push |
| Files | JavaScript, HTML, CSS | JavaScript |
| Rules | Sonar's JavaScript rules, bugs and security included, plus HTML and CSS rules | 295 of the same JavaScript rules, run through ESLint |
| Coverage and duplication | Yes | No |
| Dependencies added | None; the scanner runs in the pipeline | One devDependency, 52 MB installed |
| What it blocks | The merge, only once the check is required | `npm run lint`, so the CircleCI `check` job |

## Recommendation

Keep SonarQube Cloud as the gate and do not add eslint-plugin-sonarjs.
SonarQube Cloud already reports on every pull request, reads the HTML,
measures coverage and found the security problem. The plugin would add
editor-time feedback for Sonar's rules at the price of a dependency the
project has so far avoided (ADR-0002) and a second copy of Sonar's rules to
keep in step with the first. For feedback before the push, this change turns
on the code-smell rules ESLint already ships, which cover the complexity and
simplification side of what sonarjs flagged. Revisit the plugin if the team
finds itself fixing Sonar findings only after review has started.

Adding the plugin is the team's call; the issue asks for agreement before any
dependency is added. Until the team decides otherwise, the answer is no.

## Code-smell rules now in ESLint

All from ESLint itself, no dependency, in `eslint.config.js`. `npm run lint`
passes on `main` with them.

Size and complexity limits sit just above today's largest functions, so the
lint passes now and fails when one grows:

| Rule | Limit | Largest today |
|---|---|---|
| `complexity` | 25 | `parseCSV` in `src/data.js`, 24 |
| `max-statements` | 45 | `parseCSV`, 44 |
| `max-lines-per-function` | 75, blank lines and comments excluded | `Chart.draw` in `src/chart.js`, 73 |
| `max-depth` | 5 | `runBenchmark` in `benchmark/benchmark.js`, 5 |
| `max-params` | 6 | `Chart.#compositeBitmaps`, 6 |
| `max-nested-callbacks` | 3 | none at the limit |

Lower a limit when the function behind it is split. `parseCSV`, `randomData`
(complexity 19), `Chart.draw`, `Chart.#layout`, `RenderScheduler.render` and
`runBenchmark` are the ones these limits and sonarjs single out.

Simplification: `no-nested-ternary`, `no-else-return`, `no-lonely-if`,
`no-unneeded-ternary`, `no-useless-return`, `no-useless-concat`,
`no-negated-condition`, `no-implicit-coercion`, `prefer-object-spread`,
`object-shorthand`, `yoda`, `no-multi-assign`.

Bugs in waiting: `consistent-return`, `default-case`, `no-return-assign`,
`no-sequences`, `no-throw-literal`, `no-self-compare`,
`no-template-curly-in-string`, `no-unreachable-loop`,
`no-unused-expressions`, `require-await`, `prefer-promise-reject-errors`,
`no-constructor-return`, `no-duplicate-imports`, `no-use-before-define`
(functions excepted), `radix`, `guard-for-in`, `no-empty-function`,
`no-new-wrappers`, `no-array-constructor`.

Never in browser code: `no-eval`, `no-implied-eval`, `no-new-func`,
`no-script-url`, `no-extend-native`, `no-proto`, `no-iterator`, `no-caller`,
`no-alert`, `no-labels`.

Considered and left off, with what each flags today:

| Rule | Hits today | Why off |
|---|---|---|
| `no-shadow` | 1, `ticks` in `src/chart.js:385` | Fix it, then turn the rule on |
| `prefer-template` | 1, `benchmark/benchmark.js:272` | Same |
| `no-unmodified-loop-condition` | 2, `stopRequested` in `benchmark/benchmark.js:347` and `:358` | Worth a look. An event handler sets the flag while the loop awaits, which the rule cannot see, so it may be a false alarm |
| `no-console` | 2, `src/chart.js:207` and `:217` | A library should not log; decide whether those become events or errors |
| `no-await-in-loop` | 5 | The benchmark and the scheduler await in loops on purpose |
| `no-param-reassign` | 4, sort helpers in `src/point-set.js` | In-place sorting by design |
| `no-plusplus`, `no-continue`, `no-bitwise`, `no-undefined` | 45, 5, 2, 2 | Style preferences, not smells |

Nothing in ESLint's own rules catches an unhandled promise, Sonar's S9383.
That needs type information, which only typescript-eslint provides.

## Open SonarQube Cloud findings

The five findings in the first table are open on the dashboard. The worker
origin check and the two unhandled promises are small fixes; the heading and
the regular expression are a line each. They are not part of this change.
