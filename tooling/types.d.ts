/* Minimal ambient declarations to satisfy TypeScript checkJs for Node/Actions context */

/* Globals */
declare const process: { cwd(): string };

/* Node built-in modules (minimal shims) */
declare module "fs" {
  const fs: any;
  export = fs;
}

declare module "path" {
  const path: any;
  export = path;
}

declare module "fs/promises" {
  const fsp: any;
  export = fsp;
}

declare module "os" {
  const os: any;
  export = os;
}

declare module "child_process" {
  const cp: any;
  export = cp;
}

declare module "url" {
  export function fileURLToPath(url: any): string;
}

/* Node test/assert modules used in tests */
declare module "node:test" {
  export const describe: (name: string, fn: (...args: any[]) => any) => void;
  export const it: (name: string, fn: (...args: any[]) => any) => void;
}

declare module "node:assert" {
  const assert: any;
  export = assert;
}

/* GitHub Actions modules used by diffreader.js */
declare module "@actions/core" {
  const core: any;
  export = core;
}

declare module "@actions/github" {
  const github: any;
  export = github;
  export type GitHub = any;
}