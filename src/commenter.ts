import type { Caption } from "./captions.js";
import type { PrContext } from "./context.js";

export const MARKER = "<!-- gitroast -->";

export async function alreadyRoasted(context: PrContext): Promise<boolean> {
  const comments = await context.octokit.paginate(
    context.octokit.rest.issues.listComments,
    context.issue({ per_page: 100 }),
  );
  return comments.some((c) => c.user?.type === "Bot" && (c.body ?? "").includes(MARKER));
}

export async function imageReachable(
  url: string,
  fetchFn: typeof fetch = fetch,
  timeoutMs = 3000,
): Promise<boolean> {
  try {
    const res = await fetchFn(url, { method: "HEAD", signal: AbortSignal.timeout(timeoutMs) });
    return res.ok;
  } catch {
    return false;
  }
}

// Stops "@someone" in a PR title from pinging people when shown as plain text.
function defuseMentions(text: string): string {
  return text.replace(/@/g, "@​");
}

export function renderComment(caption: Caption, source: string, withImage: boolean): string {
  const footer = `<sub>🔥 GitRoast · picked by ${source} · add the \`no-roast\` label to opt out</sub>`;
  const main = withImage
    ? `![${caption.text.replace(/[[\]]/g, "")}](${caption.url})`
    : `> ${defuseMentions(caption.text)}`;
  return `${MARKER}\n${main}\n\n${footer}`;
}

export async function postComment(context: PrContext, body: string): Promise<void> {
  await context.octokit.rest.issues.createComment(context.issue({ body }));
}
