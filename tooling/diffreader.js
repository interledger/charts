/**
 * @typedef {{owner: string, repo: string}} RepoRef
 * @typedef {{repo: RepoRef, payload?: any}} GHContext
 * @typedef {{path: string, changeType: 'added' | 'modified' | 'removed' | 'renamed'}} ChangedFile
 */

/**
 * Get changed files between the current branch and the target branch.
 * Works for both PRs and push events.
 *
 * Note: Avoid importing '@actions/core' here so this module works inside actions/github-script
 * where dependencies are not installed as normal packages. Accept an optional core param instead.
 *
 * @param {any} octokit - An authenticated Octokit client
 * @param {GHContext} context - GitHub Actions context
 * @param {{warning?: (msg: string) => void} | undefined} core - Optional core from @actions/core
 * @returns {Promise<ChangedFile[]>}
 */
export async function getChangedFiles(octokit, context, core) {
  /** @type {ChangedFile[]} */
  const changedFiles = [];

  /** @param {string} msg */
  const warn = (msg) => {
    if (core && typeof core.warning === 'function') core.warning(msg);
    else console.warn(msg);
  };

  if (context?.payload?.pull_request) {
    // Case: Pull Request event
    const { owner, repo } = context.repo;
    const pull_number = context.payload.pull_request.number;

    const files = await octokit.paginate(
      octokit.rest.pulls.listFiles,
      {
        owner,
        repo,
        pull_number,
        per_page: 100,
      }
    );

    for (const file of files) {
      changedFiles.push({
        path: file.filename,
        changeType: file.status, // "added", "modified", "removed", "renamed"
      });
    }
  } else if (context?.payload?.commits) {
    // Case: Push event
    for (const commit of context.payload.commits) {
      for (const added of commit.added || []) {
        changedFiles.push({ path: added, changeType: 'added' });
      }
      for (const removed of commit.removed || []) {
        changedFiles.push({ path: removed, changeType: 'removed' });
      }
      for (const modified of commit.modified || []) {
        changedFiles.push({ path: modified, changeType: 'modified' });
      }
    }
  } else {
    warn('No pull_request or commits found in the context payload.');
  }

  return changedFiles;
}
