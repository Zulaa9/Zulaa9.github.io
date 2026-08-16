import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import {
  adminProjectSchema,
  serializeProjectMarkdown,
  serializeGraphNode,
  dataUrlToBase64,
  extensionFromDataUrl,
} from "../../../lib/project-admin";
import { putFile, getFileContent, encodeBase64Utf8, type GithubConfig } from "../../../lib/github";

export const prerender = false;

interface AdminEnv {
  GITHUB_TOKEN?: string;
  GITHUB_OWNER?: string;
  GITHUB_REPO?: string;
  GITHUB_BRANCH?: string;
}

function angleHintFor(slug: string): number {
  let sum = 0;
  for (const char of slug) sum += char.charCodeAt(0);
  return sum % 360;
}

function existingCoverExtension(markdown: string | null): string | undefined {
  const match = markdown ? /^cover:\s*\.\/cover\.(\w+)\s*$/m.exec(markdown) : null;
  return match?.[1];
}

export const POST: APIRoute = async (context) => {
  // Cloudflare Access should already be gating /admin/* at the edge before
  // a request ever reaches this function — that's the real auth boundary
  // (see docs/fase6-admin.md). The actual capability check here is simpler
  // and absolute: no GITHUB_TOKEN, no write, regardless of who's asking.
  const workerEnv = env as AdminEnv;
  const token = workerEnv.GITHUB_TOKEN;
  if (!token) {
    return new Response(
      JSON.stringify({
        error:
          "GITHUB_TOKEN is not configured. Set it as a Cloudflare Pages secret (wrangler secret put GITHUB_TOKEN) — this endpoint cannot write to GitHub without it.",
      }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  const config: GithubConfig = {
    token,
    owner: workerEnv.GITHUB_OWNER ?? "Zulaa9",
    repo: workerEnv.GITHUB_REPO ?? "Zulaa9.github.io",
    branch: workerEnv.GITHUB_BRANCH ?? "main",
  };

  let payload;
  try {
    const json = await context.request.json();
    payload = adminProjectSchema.parse(json);
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid payload", details: String(error) }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const markdownPath = `src/content/projects/${payload.slug}/index.md`;
    const graphPath = `src/content/graph/${payload.slug}.json`;

    const [existingMarkdown, existingGraphRaw] = await Promise.all([
      getFileContent(config, markdownPath),
      getFileContent(config, graphPath),
    ]);

    const existingCoverExt = payload.coverDataUrl ? undefined : existingCoverExtension(existingMarkdown);
    const markdown = serializeProjectMarkdown(payload, existingCoverExt);
    const isNew = existingMarkdown === null;

    const writes: Promise<unknown>[] = [
      putFile(
        config,
        markdownPath,
        encodeBase64Utf8(markdown),
        `${isNew ? "feat" : "chore"}(admin): ${isNew ? "add" : "update"} project ${payload.slug}`,
      ),
    ];

    if (payload.coverDataUrl) {
      const ext = extensionFromDataUrl(payload.coverDataUrl);
      writes.push(
        putFile(
          config,
          `src/content/projects/${payload.slug}/cover.${ext}`,
          dataUrlToBase64(payload.coverDataUrl),
          `chore(admin): update ${payload.slug} cover image`,
        ),
      );
    }

    // Graph node: preserve a hand-tuned layout/parent on edit, otherwise
    // default to auto-layout under "projects" — no visual position picker
    // in v1, see docs/fase6-admin.md.
    let graphNode = JSON.parse(serializeGraphNode(payload, angleHintFor(payload.slug)));
    if (existingGraphRaw) {
      const existing = JSON.parse(existingGraphRaw);
      graphNode = { ...graphNode, layout: existing.layout, parentId: existing.parentId };
    }
    writes.push(
      putFile(
        config,
        graphPath,
        encodeBase64Utf8(JSON.stringify(graphNode, null, 2) + "\n"),
        `${isNew ? "feat" : "chore"}(admin): ${isNew ? "add" : "update"} graph node for ${payload.slug}`,
      ),
    );

    await Promise.all(writes);

    return new Response(JSON.stringify({ ok: true, slug: payload.slug, isNew }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Save failed", details: String(error) }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
};
