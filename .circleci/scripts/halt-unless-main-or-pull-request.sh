#!/usr/bin/env bash
# End the job early, as a success, unless the commit is on main or in a pull
# request. SonarQube Cloud has nowhere to report other branches, and its Free
# plan does not analyze them.
#
# Reads CIRCLE_BRANCH, which tag pipelines leave unset, and CIRCLE_PULL_REQUEST.
set -euo pipefail

if [[ "${CIRCLE_BRANCH:-}" != "main" && -z "${CIRCLE_PULL_REQUEST:-}" ]]; then
    circleci-agent step halt
fi
