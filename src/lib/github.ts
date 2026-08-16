/**
 * Minimal GitHub Contents API client for the admin panel's "save" flow.
 * No SDK dependency — it's three small REST calls, not worth a package.
 *
 * Auth: a GitHub fine-grained PAT, scoped to Contents: Read & Write on this
 * repo only, read from the GITHUB_TOKEN binding (a Cloudflare Pages secret
 * set via `wrangler secret put` or the dashboard — never in source, never
 * pasted into a chat session). This module never logs or echoes the token.
 */

export interface GithubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

interface PutFileResult {
  sha: string;
  commitUrl: string;
}

async function githubFetch(config: GithubConfig, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "zula-dev-admin",
      ...init?.headers,
    },
  });
}

/** Returns the file's current blob SHA (needed to update an existing file), or null if it doesn't exist yet. */
export async function getFileSha(config: GithubConfig, repoPath: string): Promise<string | null> {
  const res = await githubFetch(
    config,
    `/repos/${config.owner}/${config.repo}/contents/${repoPath}?ref=${config.branch}`,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub read failed (${res.status}) for ${repoPath}: ${await res.text()}`);
  const data = (await res.json()) as { sha: string };
  return data.sha;
}

/** Fetches and decodes a file's current text content — used by the edit form to always show the latest committed version, not a stale build. */
export async function getFileContent(config: GithubConfig, repoPath: string): Promise<string | null> {
  const res = await githubFetch(
    config,
    `/repos/${config.owner}/${config.repo}/contents/${repoPath}?ref=${config.branch}`,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub read failed (${res.status}) for ${repoPath}: ${await res.text()}`);
  const data = (await res.json()) as { content: string; encoding: string };
  if (data.encoding !== "base64") throw new Error(`Unexpected encoding for ${repoPath}: ${data.encoding}`);
  return decodeBase64Utf8(data.content);
}

/** Creates or updates one file with a single commit. `contentBase64` must already be base64-encoded (text or binary). */
export async function putFile(
  config: GithubConfig,
  repoPath: string,
  contentBase64: string,
  commitMessage: string,
): Promise<PutFileResult> {
  const existingSha = await getFileSha(config, repoPath);
  const res = await githubFetch(config, `/repos/${config.owner}/${config.repo}/contents/${repoPath}`, {
    method: "PUT",
    body: JSON.stringify({
      message: commitMessage,
      content: contentBase64,
      branch: config.branch,
      ...(existingSha ? { sha: existingSha } : {}),
      committer: { name: "zula.dev admin", email: "admin@zula.dev" },
    }),
  });
  if (!res.ok) {
    throw new Error(`GitHub write failed (${res.status}) for ${repoPath}: ${await res.text()}`);
  }
  const data = (await res.json()) as { content: { sha: string }; commit: { html_url: string } };
  return { sha: data.content.sha, commitUrl: data.commit.html_url };
}

export function encodeBase64Utf8(text: string): string {
  return btoa(unescape(encodeURIComponent(text)));
}

function decodeBase64Utf8(base64: string): string {
  return decodeURIComponent(escape(atob(base64.replace(/\n/g, ""))));
}
