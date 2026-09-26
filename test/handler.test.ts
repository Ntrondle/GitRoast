import { generateKeyPairSync } from "node:crypto";
import nock from "nock";
import { Probot, ProbotOctokit } from "probot";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MARKER } from "../src/commenter.js";
import { createHandler } from "../src/handler.js";
import { FallbackPicker } from "../src/pickers/fallback.js";
import { RulesPicker } from "../src/pickers/rules.js";
import { templates } from "../src/templates.js";

const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs1", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

const GH = "https://api.github.com";
const REPO = "/repos/acme/app";

function payload(prOverrides: Record<string, unknown> = {}, action = "opened") {
  return {
    action,
    number: 7,
    installation: { id: 2 },
    repository: { name: "app", owner: { login: "acme" } },
    pull_request: {
      number: 7,
      title: "small typo fix",
      body: "Fixes a typo in the README, nothing else.",
      draft: false,
      labels: [],
      changed_files: 47,
      additions: 2310,
      deletions: 1894,
      created_at: "2026-09-22T08:00:00Z",
      user: { login: "octocat", type: "User" },
      ...prOverrides,
    },
  };
}

function makeProbot() {
  const probot = new Probot({
    appId: 1,
    privateKey,
    logLevel: "fatal",
    Octokit: ProbotOctokit.defaults({ retry: { enabled: false }, throttle: { enabled: false } }),
  });
  probot.load((app) => {
    app.on(
      ["pull_request.opened", "pull_request.reopened", "pull_request.ready_for_review"],
      createHandler({ picker: new FallbackPicker([new RulesPicker()]), templates, timeZone: "Europe/Zurich" }),
    );
  });
  return probot;
}

function receive(probot: Probot, body: ReturnType<typeof payload>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return probot.receive({ id: "1", name: "pull_request", payload: body as any });
}

// Mocks for the only GitHub calls the bot is allowed to make before commenting.
// nock.disableNetConnect() makes any other request (contents, files, diff) fail the test.
function mockReads(existingComments: unknown[] = []) {
  nock(GH)
    .post("/app/installations/2/access_tokens").reply(200, { token: "test", permissions: {} })
    .get(`${REPO}/issues/7/comments`).query({ per_page: 100 }).reply(200, existingComments)
    .get(`${REPO}/pulls/7/commits`).query({ per_page: 50 })
    .reply(200, [{ commit: { message: "fix typo" } }, { commit: { message: "wip" } }]);
}

function mockComment(): { body?: string } {
  const captured: { body?: string } = {};
  nock(GH)
    .post(`${REPO}/issues/7/comments`, (b: { body: string }) => {
      captured.body = b.body;
      return true;
    })
    .reply(201, {});
  return captured;
}

describe("PR webhook handler", () => {
  let probot: Probot;
  beforeAll(() => nock.disableNetConnect());
  afterAll(() => nock.enableNetConnect());
  beforeEach(() => {
    probot = makeProbot();
  });
  afterEach(() => nock.cleanAll());

  it("posts exactly one meme comment for a new PR", async () => {
    mockReads();
    nock("https://api.memegen.link").head(/^\/images\/mordor\//).reply(200);
    const comment = mockComment();

    await receive(probot, payload());

    expect(comment.body).toContain(MARKER);
    expect(comment.body).toMatch(/!\[.*\]\(https:\/\/api\.memegen\.link\/images\/mordor\/.+\.png\)/);
    expect(comment.body).toContain("picked by rules");
    expect(nock.isDone()).toBe(true);
  });

  it("posts a text-only roast when memegen is down", async () => {
    mockReads();
    nock("https://api.memegen.link").head(/^\/images\//).reply(503);
    const comment = mockComment();

    await receive(probot, payload());

    expect(comment.body).toMatch(/^> /m);
    expect(comment.body).not.toContain("![");
  });

  it.each([
    ["a draft", { draft: true }],
    ["a bot author", { user: { login: "dependabot[bot]", type: "Bot" } }],
    ["the no-roast label", { labels: [{ name: "no-roast" }] }],
  ])("skips %s without calling GitHub", async (_label, overrides) => {
    await receive(probot, payload(overrides));
    expect(nock.pendingMocks()).toEqual([]);
  });

  // Review focus: redelivered or reopened webhooks must not produce a second comment.
  it("does not comment twice on the same PR", async () => {
    nock(GH)
      .post("/app/installations/2/access_tokens").reply(200, { token: "test", permissions: {} })
      .get(`${REPO}/issues/7/comments`).query({ per_page: 100 })
      .reply(200, [{ user: { type: "Bot" }, body: `${MARKER}\n![x](y)` }]);

    await receive(probot, payload({}, "reopened"));

    expect(nock.isDone()).toBe(true); // no commits fetch, no comment post
  });

  it("ignores a marker comment written by a human", async () => {
    mockReads([{ user: { type: "User" }, body: `quoting the bot: ${MARKER}` }]);
    nock("https://api.memegen.link").head(/^\/images\//).reply(200);
    const comment = mockComment();

    await receive(probot, payload());

    expect(comment.body).toContain(MARKER);
  });
});
