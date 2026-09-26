import type { PrContext } from "./context.js";
import type { PrMetadata } from "./types.js";

// The only reader of GitHub data. It must never call the contents, files or diff endpoints.
export async function collectMetadata(context: PrContext): Promise<PrMetadata> {
  const pr = context.payload.pull_request;
  const commits = await context.octokit.rest.pulls.listCommits(context.pullRequest({ per_page: 50 }));
  return {
    number: pr.number,
    title: pr.title,
    body: pr.body ?? "",
    labels: pr.labels.map((l) => l.name),
    changedFiles: pr.changed_files,
    additions: pr.additions,
    deletions: pr.deletions,
    commitMessages: commits.data.map((c) => c.commit.message),
    createdAt: pr.created_at,
    author: pr.user.login,
  };
}
