import { describe, expect, it, vi } from "vitest";
import type { Caption } from "../src/captions.js";
import { imageReachable, MARKER, renderComment } from "../src/commenter.js";

const caption: Caption = {
  lines: ["One does not simply", "call 4204 lines a small change"],
  text: "One does not simply / call 4204 lines a small change",
  url: "https://api.memegen.link/images/mordor/One_does_not_simply/call_4204_lines_a_small_change.png",
};

describe("renderComment", () => {
  it("renders the image with marker and footer", () => {
    const body = renderComment(caption, "jev", true);
    expect(body.startsWith(MARKER)).toBe(true);
    expect(body).toContain(`![${caption.text}](${caption.url})`);
    expect(body).toContain("picked by jev");
    expect(body).toContain("`no-roast`");
  });

  it("renders a quoted caption when the image is unavailable", () => {
    const body = renderComment(caption, "rules", false);
    expect(body).toContain(`> ${caption.text}`);
    expect(body).not.toContain("![");
  });

  it("strips square brackets from alt text", () => {
    const body = renderComment({ ...caption, text: "[WIP] thing" }, "rules", true);
    expect(body).toContain("![WIP thing](");
  });

  // Review focus: a PR title like "@acme/core small fix" must not ping a team in the text fallback.
  it("defuses @mentions in the text fallback", () => {
    const body = renderComment({ ...caption, text: "@acme/core small fix" }, "rules", false);
    expect(body).not.toMatch(/@acme/);
    expect(body).toContain("@​acme/core");
  });
});

describe("imageReachable", () => {
  it("is true for a 2xx HEAD response", async () => {
    const fetchFn = vi.fn(async () => new Response(null, { status: 200 }));
    expect(await imageReachable("https://x/y.png", fetchFn)).toBe(true);
    expect(fetchFn).toHaveBeenCalledWith("https://x/y.png", expect.objectContaining({ method: "HEAD" }));
  });

  it("is false for an error status", async () => {
    expect(await imageReachable("https://x/y.png", vi.fn(async () => new Response(null, { status: 503 })))).toBe(false);
  });

  it("is false when the request throws", async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    expect(await imageReachable("https://x/y.png", fetchFn)).toBe(false);
  });
});
