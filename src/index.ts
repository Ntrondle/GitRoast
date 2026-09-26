import type { ApplicationFunction } from "probot";
import { buildPickers, resolveTimeZone } from "./config.js";
import { createHandler } from "./handler.js";
import { FallbackPicker } from "./pickers/fallback.js";
import { templates } from "./templates.js";

const app: ApplicationFunction = (app) => {
  const warn = (message: string) => app.log.warn(message);
  const pickers = buildPickers(process.env, warn);
  const handler = createHandler({
    picker: new FallbackPicker(pickers, warn),
    templates,
    timeZone: resolveTimeZone(process.env, warn),
  });
  app.on(["pull_request.opened", "pull_request.reopened", "pull_request.ready_for_review"], handler);
  app.log.info(`GitRoast ready; pickers: ${pickers.map((p) => p.name).join(" -> ")}`);
};

export default app;
