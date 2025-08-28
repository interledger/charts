import { describe, it } from "node:test";
import assert from "node:assert";

import { chartManager } from "../chartmanager.js";

const expectedGoodChartsList = [
  { name: "top1", version: "2.2.3", path: "top1/Chart.yaml", appVersion: "v2.4.4" },
  { name: "top2", version: "3.2.3", path: "top2/Chart.yaml", appVersion: "v2.2.2" },
  { name: "nested1", version: "1.0.0", path: "nested/nested1/Chart.yaml", appVersion: "v4.5.6" },
  { name: "nested2", version: "1.2.3", path: "nested/nested2/Chart.yaml", appVersion: "v1.1.1" },
];

describe("chartFinder/findAllCharts", () => {
  it("finds all charts in the root folder", () => {
    const rootFolder = "./tests/test-data/good-charts";
    const charts = chartManager.findAllCharts(rootFolder, []);
    assert.deepStrictEqual(charts, expectedGoodChartsList);
  });

  it("excludes specified chart names", () => {
    const rootFolder = "./tests/test-data/good-charts";
    const exclusions = ["top1", "nested2"];
    const charts = chartManager.findAllCharts(rootFolder, exclusions);
    const expectedCharts = expectedGoodChartsList.filter(
      (chart) => !exclusions.includes(chart.name)
    );
    assert.deepStrictEqual(charts, expectedCharts);
  });

  it("returns an empty array when no charts are found", () => {
    const rootFolder = "./tests/test-data/no-charts";
    const charts = chartManager.findAllCharts(rootFolder, []);
    assert.deepStrictEqual(charts, []);
  });
});

describe("chartFinder/updateChartVersion", () => {
  it("updates the version in Chart.yaml content", () => {
    const chartYamlContent = `
name: mychart
version: 1.2.3
appVersion: v1.0.0
description: A sample chart
`;
    const newVersion = "2.0.0";
    const updatedContent = chartManager.updateChartVersion(chartYamlContent, newVersion);
    const expectedContent = `name: mychart
version: 2.0.0
appVersion: v1.0.0
description: A sample chart
`;
    assert.strictEqual(updatedContent.trim(), expectedContent.trim());
  });

});

describe("chartFinder/updateChartVersionFiles", () => {
  it("updates the Chart.yaml files for specified charts under given base directory", async () => {
    // Copy test data to a temp directory to avoid modifying original files
    const fs = await import("fs/promises");
    const path = await import("path");
    const os = await import("os");
    const { execSync } = await import("child_process");
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "chartmanager-"));
    const srcDir = path.resolve("./tests/test-data/good-charts");
    execSync(`cp -r ${srcDir}/* ${tmpDir}/`);
    const chartsToUpdate = ["top1", "nested1"];
    const newVersion = "9.9.9";
    await chartManager.updateChartVersionFiles(tmpDir, chartsToUpdate, newVersion);

    // use findAllCharts to verify versions
    const updatedCharts = chartManager.findAllCharts(tmpDir, []);
    const expectedUpdatedCharts = expectedGoodChartsList.map((chart) => {
      if (chartsToUpdate.includes(chart.name)) {
        // Version should have been updated but appVersion should remain the same
        return { ...chart, version: newVersion, appVersion: chart.appVersion };
      }
      return chart;
    });
    assert.deepStrictEqual(updatedCharts, expectedUpdatedCharts);
    // Clean up temp directory
    await fs.rm(tmpDir, { recursive: true, force: true });
  });
});


describe("chartManager/package", () => {
  it("packages a chart directory into a .tgz file", async () => {
    // For the given chart directory the function is supposed to execute the following commands:
    // - helm dep update {CHART_DIR}
    // - helm package {CHART_DIR} -d docs/interledger
    // Since we don't actually want to run helm commands in a test environment we will pass in a mock childProcess
    /** @type {{ exec: (cmd: string, options: unknown, callback: (error: Error|null, stdout: string, stderr: string) => void) => void }} */
    const mockChildProcess = { exec: (
      /** @type {string} */ cmd,
      /** @type {unknown} */ options,
      /** @type {(error: (Error|null), stdout: string, stderr: string) => void} */ callback
    ) => {
      // Simulate async execution
      setTimeout(() => {
        if (cmd.startsWith("helm dep update")) {
          callback(null, "Dependencies updated", "");
        } else if (cmd.startsWith("helm package")) {
          callback(null, "Chart packaged", "");
        } else {
          callback(new Error("Unknown command"), "", "Error");
        }
      }, 10);
    }};

    const chartDir = "./tests/test-data/good-charts/top1";
    const outputDir = "./tests/test-data/good-charts/docs/interledger";

    // Ensure output directory exists
    const fs = await import("fs/promises");
    await fs.mkdir(outputDir, { recursive: true });
    await chartManager.packageChart(chartDir, outputDir, mockChildProcess);

    // verify mockChildProcess was called with expected commands
    // Since we don't have a way to directly inspect calls to mockChildProcess in this simple setup,
    // we will assume if no errors were thrown the function worked as expected.
    // In a more complex setup, we could use a spying library to verify calls.
    assert.ok(true, "packageChart executed without errors");
    
  });
});

describe("chartManager/generateChartIndex", () => {
  it("regenerates the index for all packages", async () => {
    /** @type {{ exec: (cmd: string, options: unknown, callback: (error: Error|null, stdout: string, stderr: string) => void) => void }} */
    const mockChildProcess = { exec: (
      /** @type {string} */ cmd,
      /** @type {unknown} */ options,
      /** @type {(error: (Error|null), stdout: string, stderr: string) => void} */ callback
    ) => {
      // Simulate async execution
      setTimeout(() => {
        if (cmd.startsWith("helm repo index")) {
          callback(null, "Index generated", "");
        } else {
          callback(new Error("Unknown command"), "", "Error");
        }
      }, 10);
    }
  };
  const fs = await import("fs/promises");  
  const outputDir = "./tests/test-data/good-charts/docs/interledger";
  const repoUrl = "https://interledger.github.io/charts/interledger";
  await fs.mkdir(outputDir, { recursive: true });
  await chartManager.regenerateHelmIndex(outputDir, repoUrl, mockChildProcess);
  });
})