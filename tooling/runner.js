import { getChangedFiles } from "./diffreader.js";
import { chartManager } from "./chartmanager.js";
import { calculateVersions } from "./versioner.js";
import cp from "child_process";
import path from "path";

/**
 * Execute a shell command and return its stdout as string (utf8).
 * Throws on non‑zero exit code.
 * @param {string} cmd
 * @param {{inherit?: boolean}} [opts]
 */
function run(cmd, opts = {}) {
  const stdio = opts.inherit ? "inherit" : ["ignore", "pipe", "pipe"];
  return cp.execSync(cmd, { encoding: "utf8", stdio });
}

/**
 * Normalize a possibly missing object.
 * @template T
 * @param {T | null | undefined} v
 * @param {T} dflt
 * @returns {T}
 */
function orDefault(v, dflt) {
  return v ?? dflt;
}

/**
 * Determine a commit message to use for version calculation.
 * Prefers PR title (conventional-commit formatted). Falls back to a safe chore message.
 * @param {any} context
 */
function resolveCommitMessage(context) {
  const fallback = "chore: bump charts";
  try {
    if (context?.payload?.pull_request?.title) return String(context.payload.pull_request.title);
    if (context?.payload?.head_commit?.message) return String(context.payload.head_commit.message);
    // Access env via any-cast to satisfy minimal types
    const anyProc = /** @type {any} */ (process);
    if (anyProc?.env?.PR_TITLE) return String(anyProc.env.PR_TITLE);
  } catch {
    /* ignore */
  }
  return fallback;
}

/**
 * Safe string for error objects.
 * @param {any} err
 * @returns {string}
 */
function errorMessage(err) {
  try {
    const e = /** @type {any} */ (err);
    if (e && typeof e.message === "string") return e.message;
    return String(err);
  } catch {
    return "unknown error";
  }
}

/**
 * Determine the branch to push to from CI (handles PR and push events).
 * @param {any} context
 * @returns {string | null}
 */
function resolveTargetBranch(context) {
  try {
    // PR workflows
    if (context?.payload?.pull_request?.head?.ref) return String(context.payload.pull_request.head.ref);
    // Access env via any-cast to satisfy minimal types (no @types/node in toolchain)
    const anyProc = /** @type {any} */ (process);
    if (anyProc?.env?.GITHUB_HEAD_REF) return String(anyProc.env.GITHUB_HEAD_REF);
    // Push workflows
    const ref = context?.ref || anyProc?.env?.GITHUB_REF || "";
    const m = String(ref).match(/^refs\/heads\/(.+)$/);
    if (m) return m[1];
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Commit and push staged changes, if any.
 * @param {Record<string,string>} versionsMap
 * @param {any} core
 * @param {any} context
 */
function commitAndPush(versionsMap, core, context) {
  try {
    // Check if there is anything staged
    const staged = run("git diff --cached --name-only").trim();
    if (!staged) {
      (core?.info ?? console.log)("No staged changes to commit.");
      return;
    }

    // Configure bot identity (idempotent)
    run('git config user.name "github-actions[bot]"');
    run('git config user.email "github-actions[bot]@users.noreply.github.com"');

    const parts = Object.entries(versionsMap)
      .map(([n, v]) => `${n}@${v}`)
      .join(", ");
    const msg = `chore(version): bump charts ${parts}`;

    // Escape any double quotes to keep shell happy
    const safeMsg = msg.replace(/"/g, '\\"');

    // Commit
    run(`git commit -m "${safeMsg}"`, { inherit: true });

    // Push using explicit branch ref to handle detached HEAD
    const targetBranch = resolveTargetBranch(context);
    if (!targetBranch) {
      (core?.warning ?? console.warn)("Cannot determine target branch for push (detached HEAD). Skipping push.");
      return;
    }
    run(`git push origin HEAD:refs/heads/${targetBranch}`, { inherit: true });
    (core?.info ?? console.log)(`Pushed version bumps to ${targetBranch}: ${parts}`);
  } catch (err) {
    (core?.warning ?? console.warn)(`Failed to commit/push changes: ${errorMessage(err)}`);
  }
}

/**
 * This function is to be called from the GitHub action that handles versioning of charts on PR modification
 * events. It will:
 * - Determine the changed files in the PR
 * - Identify which charts are affected by the changes
 * - Calculate the new versions for those charts based on conventional commit rules
 * - Update the Chart.yaml files with the new versions
 * - Commit and push the changes back to the PR branch
 */
export async function runPRVersioning(params = /** @type {any} */({})) {
  const { github, core, context, pullRequestMode = true } = params;

  (core?.info ?? console.log)("Run PR versioning");

  // Prepare environment
  const octokit = github; // In actions/github-script, `github` is an authenticated Octokit
  const chartsRoot = "charts";

  // If PR has label 'manual-versioning', skip automatic versioning early
  if (pullRequestMode) {
    try {
      const prNumber = context?.payload?.pull_request?.number;
      if (prNumber && octokit) {
        const { data: labels } = await octokit.rest.issues.listLabelsOnIssue({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: prNumber,
        });
        if ((/** @type {{name: string}[]} */ (labels)).some((l) => l.name === "manual-versioning")) {
          (core?.info ?? console.log)("PR has label 'manual-versioning'. Skipping automatic versioning.");
          return;
        }
      }
    } catch (e) {
      (core?.warning ?? console.warn)(`Failed to check PR labels: ${errorMessage(e)}`);
    }
  }

  // Get changed files from PR/push context
  /** @type {{ path: string, changeType: string }[]} */
  const changedAll = await getChangedFiles(octokit, orDefault(context, {}), core);

  // Output all changed files for diagnostics
  (core?.info ?? console.log)(`Detected ${changedAll.length} changed file(s) in total`);
  for (const f of changedAll) {
    (core?.info ?? console.log)(` - ${f.changeType}: ${f.path}`);
  }

  console.log("Applying chart filter");
  // Filter to only those under charts/
  const changed = changedAll.filter((f) => typeof f.path === "string" && /^charts\//.test(f.path));

  // If no charts changed, exit early
  (core?.info ?? console.log)(`Detected ${changed.length} changed file(s) under charts/`);
  if (changed.length === 0) {
    (core?.info ?? console.log)("No chart changes detected. Exiting.");
    return;
  }

  (core?.info ?? console.log)(`Detected ${changed.length} changed file(s) under charts/`);

  // Find all available charts (useful for mapping names->paths later)
  const discovered = chartManager.findAllCharts(chartsRoot, []);
  const nameToPath = new Map(discovered.map((c) => [c.name, c.path]));

  // Calculate new versions using versioner.js
  let message = resolveCommitMessage(context);
  /** @type {Record<string,string>} */
  let versionsMap = {};
  try {
    versionsMap = calculateVersions(changed, message);
  } catch (e) {
    // Fallback to a safe patch bump if the message isn't a valid conventional commit
    const safeMsg = "chore: bump";
    versionsMap = calculateVersions(changed, safeMsg);
    (core?.warning ?? console.warn)(`Non-conventional commit/PR title detected. Falling back to patch bump. Reason: ${errorMessage(e)}`);
  }

  // Exit if no versions to update
  const chartsToUpdate = Object.keys(versionsMap);
  if (chartsToUpdate.length === 0) {
    (core?.info ?? console.log)("No chart versions to update. Exiting.");
    return;
  }

  // Update Chart.yaml files and package updated charts
  for (const [chartName, newVersion] of Object.entries(versionsMap)) {
    await chartManager.updateChartVersionFiles(chartsRoot, [chartName], newVersion);
    const rel = nameToPath.get(chartName);
    if (!rel) {
      (core?.warning ?? console.warn)(`Cannot package ${chartName}: path not found in discovery map`);
      continue;
    }
    (core?.info ?? console.log)(`Updated ${chartName} (${rel}) -> ${newVersion}`);

    // Package the chart into docs/interledger using Helm
    try {
      const chartDir = path.join(chartsRoot, path.dirname(rel));
      const outputDir = "docs/interledger";
      await chartManager.packageChart(chartDir, outputDir, cp);
      (core?.info ?? console.log)(`Packaged ${chartName} -> ${outputDir}`);
    } catch (e) {
      (core?.warning ?? console.warn)(`Packaging failed for ${chartName}: ${errorMessage(e)}`);
    }
  }


  // Regenerate the index using chartManager.regenerateHelmIndex
  try {
    await chartManager.regenerateHelmIndex("docs/interledger", "https://interledger.org/charts/", cp);
    run(`git add "docs/interledger/index.yaml"`);
    (core?.info ?? console.log)("Regenerated Helm index");
  } catch (e) {
    (core?.warning ?? console.warn)(`Failed to regenerate Helm index: ${errorMessage(e)}`);
  }

  // Stage everything in the docs/interledger directory
  try {
    run(`git add "docs/interledger"`);
  } catch (e) {
    (core?.warning ?? console.warn)(`Failed staging packaged charts: ${errorMessage(e)}`);
  }

  // Stage changed Chart.yaml files explicitly
  try {
    const filesToAdd = discovered
      .filter((c) => chartsToUpdate.includes(c.name))
      .map((c) => path.join(chartsRoot, ...c.path.split("/")));
    for (const file of filesToAdd) {
      run(`git add "${file}"`);
    }
  } catch (e) {
    (core?.warning ?? console.warn)(`Failed staging files: ${errorMessage(e)}`);
  }  

  // Commit and push changes (only in PR mode; for local/test usage you can disable)
  if (pullRequestMode) {
    commitAndPush(versionsMap, core, context);
  }
}

export default runPRVersioning;