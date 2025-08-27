import { describe, it } from "node:test";
import assert from "node:assert";

import { calculateVersions } from "../versioner.js";

describe("versioner/calculate", () => {

    it("calculate single bugfix change on top1",()=>{

        const changeList = [
            {
                "path":"good-charts/top1/values.yaml",
                "changeType":"modified",
            }
        ]
        const msg = "feat: some feature"
        const newVersions = calculateVersions(changeList, msg)

        assert.deepStrictEqual(newVersions, {
            "top1": "2.3.0", // bump minor for feat
        })
    });


    it("calculate single feat change on top1",()=>{

        const changeList = [
            {
                "path":"good-charts/top1/values.yaml",
                "changeType":"modified",
            }
        ]
        const msg = "feat: some feature"
        const newVersions = calculateVersions(changeList, msg)

        assert.deepStrictEqual(newVersions, {
            "top1": "2.3.0", // bump minor for feat
        })
    });

    it("calculate single breaking change on top1",()=>{

        const changeList = [
            {
                "path":"good-charts/top1/values.yaml",
                "changeType":"modified",
            }
        ]
        const msg = "feat!: some breaking feature"
        const newVersions = calculateVersions(changeList, msg)

        assert.deepStrictEqual(newVersions, {
            "top1": "3.0.0", // bump major for breaking change
        })
    });

    it("calculate multiple changes on different charts",()=>{

        const changeList = [
            {
                "path":"good-charts/top1/values.yaml",
                "changeType":"modified",
            },
            {
                "path":"good-charts/nested/nested2/values.yaml",
                "changeType":"modified",
            }
        ]
        const msg = "fix: some bugfix"
        const newVersions = calculateVersions(changeList, msg)

        assert.deepStrictEqual(newVersions, {
            "top1": "2.2.4", // bump patch for fix
            "nested2": "1.2.4", // bump patch for fix
        })
    });

    it("calculate multiple changes on different charts with different bumps",()=>{

        const changeList = [
            {
                "path":"good-charts/top1/values.yaml",
                "changeType":"modified",
            },
            {
                "path":"good-charts/nested/nested2/values.yaml",
                "changeType":"modified",
            }
        ]
        const msg = "feat!: some breaking feature"
        const newVersions = calculateVersions(changeList, msg)

        assert.deepStrictEqual(newVersions, {
            "top1": "3.0.0", // bump major for breaking change
            "nested2": "2.0.0", // bump major for breaking change
        })
    });

    it("calculate multiple doc changes on different charts, should bump patch",()=>{

        const changeList = [
            {
                "path":"good-charts/top1/README.md",
                "changeType":"modified",
            },
            {
                "path":"good-charts/nested/nested2/README.md",
                "changeType":"modified",
            }
        ]
        const msg = "docs: update documentation"
        const newVersions = calculateVersions(changeList, msg)

        assert.deepStrictEqual(newVersions, {
            "top1": "2.2.4", // bump patch for docs
            "nested2": "1.2.4", // bump patch for docs
        })
    });

    it("files outside charts should be ignored",()=>{

        const changeList = [
            {
                "path":"some-other-file.txt",
                "changeType":"modified",
            },
            {
                "path":"tooling/some-script.js",
                "changeType":"modified",
            }
        ]
        const msg = "feat: some feature"
        const newVersions = calculateVersions(changeList, msg)

        assert.deepStrictEqual(newVersions, {
            // no charts changed
        })
    });
})