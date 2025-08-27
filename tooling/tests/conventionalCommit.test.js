import { describe, it } from "node:test";
import assert from "node:assert";

import { analyse } from "../conventionalCommit.js";

describe("conventionalCommit/analyse", () => {

    it("analyzes a simple fix commit",()=>{

        const msg = "fix: some bugfix"
        const cc = analyse(msg)

        assert.deepStrictEqual(cc, { scope: null, type: 'fix', isBreaking: false });
    });

    it("analyzes a simple feat commit",()=>{

        const msg = "feat: some feature"
        const cc = analyse(msg)

        assert.deepStrictEqual(cc, { scope: null, type: 'feat', isBreaking: false });
    });

    it("analyzes a breaking change commit",()=>{

        const msg = "feat!: some breaking feature"
        const cc = analyse(msg)

        assert.deepStrictEqual(cc, { scope: null, type: 'feat', isBreaking: true });
    });

    it("analyzes a commit with scope",()=>{

        const msg = "feat(scope): some feature"
        const cc = analyse(msg)

        assert.deepStrictEqual(cc, { scope: 'scope', type: 'feat', isBreaking: false });
    });

    it("analyzes a commit with scope and breaking change",()=>{

        const msg = "feat(scope)!: some breaking feature"
        const cc = analyse(msg)

        assert.deepStrictEqual(cc, { scope: 'scope', type: 'feat', isBreaking: true });
    });

    it("analyzes a commit with body breaking change",()=>{

        const msg = "feat(scope): some feature\n\nBREAKING CHANGE: something broke"
        const cc = analyse(msg)

        assert.deepStrictEqual(cc, { scope: 'scope', type: 'feat', isBreaking: true });
    });

    it("analyzes a commit with body breaking change but no scope",()=>{

        const msg = "feat: some feature\n\nBREAKING CHANGE: something broke"
        const cc = analyse(msg)

        assert.deepStrictEqual(cc, { scope: null, type: 'feat', isBreaking: true });
    });

    it("analyzes a commit with a scope and of type docs",()=>{

        const msg = "docs(scope): some docs"
        const cc = analyse(msg)

        assert.deepStrictEqual(cc, { scope: 'scope', type: 'docs', isBreaking: false });
    });

    it("analyzes a commit that does not conform, should error",()=>{
        const msg = "some random commit message"
        assert.throws(() => {
            analyse(msg)
        }, /Invalid conventional commit message/)
    });

});