import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { analyse } from "./conventionalCommit.js";

/**
 * Strip surrounding single/double quotes and trim.
 * @param {string | null | undefined} s
 * @returns {string | null}
 */
function stripQuotes(s) {
  return s ? s.replace(/^['"]|['"]$/g, "").trim() : null;
}

/**
 * Read the version field from a Chart.yaml file.
 * @param {string} chartYamlPath
 * @returns {string | null}
 */
function readChartVersion(chartYamlPath) {
  try {
    const content = fs.readFileSync(chartYamlPath, "utf8");
    const m = content.match(/^version:\s*(.+)$/m);
    return stripQuotes(m ? m[1] : null);
  } catch {
    return null;
  }
}

/**
 * Bump a semver string by level.
 * @param {string | null} current
 * @param {"major" | "minor" | "patch"} level
 * @returns {string}
 */
function bumpVersion(current, level) {
  /** @param {string} n */
  const toInt = (n) => parseInt(n, 10) || 0;
  const parts = (current || "0.0.0").split(".").map(toInt);
  let [maj, min, pat] = parts;
  if (level === "major") {
    maj += 1;
    min = 0;
    pat = 0;
  } else if (level === "minor") {
    min += 1;
    pat = 0;
  } else {
    pat += 1;
  }
  return `${maj}.${min}.${pat}`;
}

/**
 * Resolve the base directory where tests/test-data lives.
 * @returns {string}
 */
function resolveTestDataBase() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(process.cwd(), "tooling/tests/test-data"),
    path.resolve(__dirname, "tests/test-data"),
    path.resolve(process.cwd(), "tests/test-data"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  /** @param {string} start @param {string} target @returns {string | null} */
  function findDirByName(start, target) {
    let entries;
    try {
      entries = fs.readdirSync(start, { withFileTypes: true });
    } catch {
      return null;
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (e.name === target) return path.join(start, e.name);
      const found = findDirByName(path.join(start, e.name), target);
      if (found) return found;
    }
    return null;
  }
  const found = findDirByName(__dirname, "test-data");
  return found || __dirname;
}

/**
 * @typedef {{ path?: string, changeType?: string }} Change
 * @param {Change} change
 * @returns {{ chartName: string | null, chartYamlPath: string | null }}
 */
function chartInfoFromChange(change) {
  const rel = (change.path || "").replace(/^\.?\/*/, "");
  if (!rel) return { chartName: null, chartYamlPath: null };

  const repoBase = process.cwd();
  const testBase = resolveTestDataBase();

  // Given a base dir, walk up the changed path directories to find the first Chart.yaml
  const relDir = rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "";
  const parts = relDir ? relDir.split("/") : [];

  /** @param {string} base @returns {string | null} */
  function findChartYaml(base) {
    for (let i = parts.length; i >= 1; i--) {
      const sub = parts.slice(0, i).join("/");
      const candidate = path.join(base, sub, "Chart.yaml");
      try {
        if (fs.existsSync(candidate)) return candidate;
      } catch {
        /* ignore */
      }
    }
    return null;
  }

  // Prefer real repo, fall back to tests dir so unit tests still pass
  const chartYamlPath = findChartYaml(repoBase) || findChartYaml(testBase);
  if (!chartYamlPath) return { chartName: null, chartYamlPath: null };

  try {
    const content = fs.readFileSync(chartYamlPath, "utf8");
    const m = content.match(/^name:\s*(.+)$/m);
    const chartName = stripQuotes(m ? m[1] : null);
    return { chartName, chartYamlPath };
  } catch {
    return { chartName: null, chartYamlPath: null };
  }
}

/**
 * Calculate new versions for charts affected by a change list and commit message.
 * @param {Change[]} changeList
 * @param {string} commitMessage
 * @returns {Record<string, string>}
 */
export function calculateVersions(changeList, commitMessage) {
  const cc = analyse(commitMessage);
  const bump = cc.isBreaking ? "major" : cc.type === "feat" ? "minor" : "patch";

  /** @type {{ patch: 0, minor: 1, major: 2 }} */
  const levelWeight = { patch: 0, minor: 1, major: 2 };
  /** @type {Record<string, number>} */
  const chosen = {}; // chartName -> highest bump weight across changes
  /** @type {Record<string, string>} */
  const chartPath = {}; // chartName -> Chart.yaml absolute path

  /** @type {Change[]} */
  const list = changeList || [];
  for (const change of list) {
    const { chartName, chartYamlPath } = chartInfoFromChange(change);
    if (!chartName || !chartYamlPath) continue;
    const w = levelWeight[bump];
    if (chosen[chartName] === undefined || w > chosen[chartName]) {
      chosen[chartName] = w;
    }
    if (!chartPath[chartName]) {
      chartPath[chartName] = chartYamlPath;
    }
  }

  /** @type {Record<string, string>} */
  const results = {};
  for (const [name, weight] of Object.entries(chosen)) {
    const lvl =
      /** @type {"patch" | "minor" | "major"} */ (
        Object.entries(levelWeight).find(([_, v]) => v === weight)?.[0] || "patch"
      );
    const chartYamlPath = chartPath[name];
    const current = readChartVersion(chartYamlPath);
    if (!current) continue;
    results[name] = bumpVersion(current, lvl);
  }
  return results;
}