import { buildCaption } from "./captions.js";
import { collectMetadata } from "./collector.js";
import { alreadyRoasted, imageReachable, postComment, renderComment } from "./commenter.js";
import type { PrContext } from "./context.js";
import { computeSignals } from "./signals.js";
import type { Picker, Template } from "./types.js";

export interface HandlerDeps {
  picker: Picker;
  templates: Template[];
  timeZone: string;
  fetch?: typeof fetch;
  imageTimeoutMs?: number;
}

export function skipReason(pr: PrContext["payload"]["pull_request"]): string | null {
  if (pr.draft) return "draft";
  if (pr.user.type === "Bot") return "bot author";
  if (pr.labels.some((l) => l.name === "no-roast")) return "no-roast label";
  return null;
}

export function createHandler(deps: HandlerDeps) {
  return async (context: PrContext): Promise<void> => {
    const pr = context.payload.pull_request;
    const reason = skipReason(pr);
    if (reason) {
      context.log.info(`skipping #${pr.number}: ${reason}`);
      return;
    }
    if (await alreadyRoasted(context)) {
      context.log.info(`skipping #${pr.number}: already roasted`);
      return;
    }

    const meta = await collectMetadata(context);
    const signals = computeSignals(meta, deps.timeZone);
    const pick = await deps.picker.pick(meta, signals, deps.templates);
    const template = pick && deps.templates.find((t) => t.id === pick.templateId);
    if (!pick || !template) {
      context.log.warn(`no meme picked for #${pr.number}`);
      return;
    }

    const caption = buildCaption(template, meta, signals);
    const withImage = await imageReachable(caption.url, deps.fetch, deps.imageTimeoutMs);
    await postComment(context, renderComment(caption, pick.source, withImage));
    context.log.info(`roasted #${pr.number} with ${template.id} (picked by ${pick.source})`);
  };
}
