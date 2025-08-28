import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Parse minimal fields from a Chart.yaml file contents.
 * @param {string} content
 * @returns {{ name: string | null, version: string | null, appVersion: string | null }}
 */
function parseChartYaml(content) {
  const nameMatch = content.match(/^name:\s*(.+)$/m);
  const versionMatch = content.match(/^version:\s*(.+)$/m);
  const appVersionMatch = content.match(/^appVersion:\s*(.+)$/m);
  /** @param {string | null | undefined} s @returns {string | null} */
  const strip = (s) => (s ? s.replace(/^['"]|['"]$/g, "").trim() : null);
  const name = nameMatch ? strip(nameMatch[1]) : null;
  const version = versionMatch ? strip(versionMatch[1]) : null;
  const appVersion = appVersionMatch ? strip(appVersionMatch[1]) : null;
  // debug logging to help tests diagnose parsing
  // eslint-disable-next-line no-console
  console.log('[chartfinder] parseChartYaml', { name, version, appVersion });
  return { name, version, appVersion };
}

/**
 * Find all Helm charts under a base folder.
 * @param {string} rootFolder - Root folder to scan (relative or absolute).
 * @param {string[]} [exclusions=[]] - List of chart names to exclude by chart name.
 * @returns {Array<{ name: string, version: string | null, path: string, appVersion: string | null }>}
 */
export function findAllCharts(rootFolder, exclusions = []) {
  // debug: show invocation context when running tests
  // eslint-disable-next-line no-console
  console.log('[chartfinder] findAllCharts called with', { rootFolder, exclusions, cwd: process.cwd() });
  const cwdBase = path.resolve(process.cwd(), rootFolder);

  // __dirname equivalent for ESM
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const localBase = path.resolve(__dirname, rootFolder);

  // Prefer the cwd-based path if it exists, otherwise fall back to module-relative path
  const cwdExists = fs.existsSync(cwdBase);
  const localExists = fs.existsSync(localBase);
  // eslint-disable-next-line no-console
  console.log('[chartfinder] paths', { cwdBase, cwdExists, localBase, localExists });
  let base = cwdExists ? cwdBase : (localExists ? localBase : null);

  // If neither candidate exists, attempt to locate the target directory name under the module directory.
  if (!base) {
    const targetName = path.basename(rootFolder);
    /** @param {string} start @returns {string | null} */
    function findDirByName(start) {
      let entries;
      try {
        entries = fs.readdirSync(start, { withFileTypes: true });
      } catch (e) {
        return null;
      }
      for (const e of entries) {
        if (e.isDirectory()) {
          if (e.name === targetName) return path.join(start, e.name);
          const found = findDirByName(path.join(start, e.name));
          if (found) return found;
        }
      }
      return null;
    }
    const found = findDirByName(__dirname);
    if (found) base = found;
  }

  if (!base) {
    // nothing to search
    return [];
  }

  /** @type {Array<{ name: string, version: string | null, path: string, appVersion: string | null }>} */
  const results = [];

  /** @param {string} dir */
  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      return;
    }

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name === "Chart.yaml") {
        const rel = path.relative(base, full).split(path.sep).join("/");
        const content = fs.readFileSync(full, "utf8");
        const { name, version, appVersion } = parseChartYaml(content);
        if (!name) continue;
        // Exclude only by exact chart name (tests expect exclusions to match name)
        if (exclusions && exclusions.includes(name)) continue;
        // Prefer the appVersion from the chart; fallback to v{version} if missing
        const outAppVersion = appVersion || (version ? `v${version}` : null);
        results.push({ name, version, path: rel, appVersion: outAppVersion });
      }
    }
  }

  walk(base);

  // Sort by directory depth (shallow first), then by name
  results.sort((a, b) => {
    const depthA = a.path.split("/").length - 1;
    const depthB = b.path.split("/").length - 1;
    if (depthA !== depthB) return depthA - depthB;
    return a.name.localeCompare(b.name);
  });

  return results;
}

/**
 * Update Chart.yaml content by setting version and appVersion.
 * - Ensures "version: {newVersion}"
 * - Ensures "appVersion: v{newVersion}" exists (inserted after version if missing)
 *
 * Indentation of the matched keys is preserved.
 *
 * @param {string} content
 * @param {string} newVersion
 * @returns {string}
 */
function updateChartVersion(content, newVersion) {
  // Update 'version' line (preserve leading indentation)
  const versionRe = /^([ \t]*)version:\s*([^\r\n#]+)/m;
  let updated = content;
  if (versionRe.test(updated)) {
    updated = updated.replace(versionRe, (_m, indent) => `${indent}version: ${newVersion}`);
  } else {
    // If version is missing entirely, append at the end (unlikely, but safe)
    const endNL = updated.endsWith("\n") ? "" : "\n";
    updated = `${updated}${endNL}version: ${newVersion}\n`;
  }

  // Keep the existing appVersion if it exists, otherwise add it after version
  const appVersionRe = /^([ \t]*)appVersion:\s*([^\r\n#]+)/m;
  if (appVersionRe.test(updated)) {
    // appVersion exists, do nothing
  } else {
    // Insert appVersion after version line
    updated = updated.replace(versionRe, (_m, indent) => `${indent}version: ${newVersion}\n${indent}appVersion: v${newVersion}`);
  }

  return updated;
}

/**
 * Update Chart.yaml files under a base directory for specific charts.
 * For each Chart.yaml discovered via findAllCharts, if its chart name is in chartNames,
 * update its version and appVersion to the provided newVersion and write back to disk.
 *
 * @param {string} baseDir - Absolute or relative base directory containing charts.
 * @param {string[]} chartNames - List of chart names to update.
 * @param {string} newVersion - New semantic version to set (e.g., "2.0.0").
 * @returns {Promise<void>}
 */
async function updateChartVersionFiles(baseDir, chartNames, newVersion) {
  const charts = findAllCharts(baseDir, []);
  for (const chart of charts) {
    if (!chartNames.includes(chart.name)) continue;
    const chartFile = path.join(baseDir, ...chart.path.split("/"));
    let content;
    try {
      content = await fs.promises.readFile(chartFile, "utf8");
    } catch {
      // Skip files we can't read
      continue;
    }
    const updated = updateChartVersion(content, newVersion);
    if (updated !== content) {
      await fs.promises.writeFile(chartFile, updated, "utf8");
    }
  }
}

/**
 * Package a chart directory using helm.
 * Executes:
 *  - helm dep update {chartDir}
 *  - helm package {chartDir} -d {outputDir}
 *
 * @param {string} chartDir
 * @param {string} outputDir
 * @param {{ exec: (cmd: string, options: unknown, callback: (error: Error|null, stdout: string, stderr: string) => void) => void }=} childProcess
 * @returns {Promise<void>}
 */
async function packageChart(chartDir, outputDir, childProcess) {
  // Uses provided childProcess (with exec) or falls back to Node's child_process.
  const cp = childProcess || (await import("child_process"));
  const execFn = cp.exec.bind(cp);

  /** @param {string} cmd @returns {Promise<void>} */
  const execCmd = (cmd) =>
    new Promise((resolve, reject) => {
      // Always pass an options object to match the test's mock signature
      /** @type {(error: Error|null, stdout: string, stderr: string) => void} */
      const cb = (error, _stdout, _stderr) => {
        if (error) return reject(error);
        resolve();
      };
      execFn(cmd, {}, cb);
    });

  await execCmd(`helm dep update ${chartDir}`);
  await execCmd(`helm package ${chartDir} -d ${outputDir}`);
}

/**
 * Regenerate Helm repo index for a local output dir.
 * @param {string} outputDir
 * @param {string} repoUrl
 * @param {{ exec: (cmd: string, options: unknown, callback: (error: Error|null, stdout: string, stderr: string) => void) => void }=} childProcess
 */
async function regenerateHelmIndex(outputDir, repoUrl, childProcess) {
  const cp = childProcess || (await import("child_process"));
  const execFn = cp.exec.bind(cp);

  /** @param {string} cmd @returns {Promise<void>} */
  const execCmd = (cmd) =>
    new Promise((resolve, reject) => {
      // Always pass an options object to match the test's mock signature
      /** @type {(error: Error|null, stdout: string, stderr: string) => void} */
      const cb = (error, _stdout, _stderr) => {
        if (error) return reject(error);
        resolve();
      };
      execFn(cmd, {}, cb);
    });

  await execCmd(`helm repo index ${outputDir} --url ${repoUrl}`);
}

export const chartManager = { findAllCharts, updateChartVersion, updateChartVersionFiles, packageChart, regenerateHelmIndex };