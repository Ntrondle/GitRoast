import type { Context } from "probot";

export type PrContext = Context<
  "pull_request.opened" | "pull_request.reopened" | "pull_request.ready_for_review"
>;
