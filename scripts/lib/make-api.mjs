// Thin client for Make's custom app (SDK) API: https://developers.make.com/api-documentation

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/** Reads KEY=value lines from .env without adding a dependency. Real env vars win. */
export function loadDotEnv(root) {
  const file = resolve(root, ".env");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match || line.trimStart().startsWith("#")) continue;
    const [, key, raw] = match;
    if (process.env[key] === undefined) process.env[key] = raw.replace(/^(['"])(.*)\1$/, "$2");
  }
}

export class MakeApi {
  constructor({ zone, token }) {
    if (!token) {
      throw new Error(
        "MAKE_API_TOKEN is not set. Put it in .env (see .env.example); it needs the sdk-apps:read and sdk-apps:write scopes.",
      );
    }
    this.base = `https://${zone}/api/v2`;
    this.token = token;
  }

  async request(method, path, { body, contentType = "application/json" } = {}) {
    const response = await fetch(this.base + path, {
      method,
      headers: {
        authorization: `Token ${this.token}`,
        accept: "application/json",
        ...(body !== undefined ? { "content-type": contentType } : {}),
      },
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });
    const text = await response.text();
    if (!response.ok) {
      let detail = text.slice(0, 500);
      try {
        const parsed = JSON.parse(text);
        detail = parsed.detail ?? parsed.message ?? detail;
      } catch {
        /* not JSON */
      }
      const error = new Error(`${method} ${path} failed with ${response.status}: ${detail}`);
      error.status = response.status;
      throw error;
    }
    return text;
  }

  async json(method, path, options) {
    const text = await this.request(method, path, options);
    return text ? JSON.parse(text) : null;
  }

  /** A section's content as text, or null when the app has none. */
  async section(path) {
    try {
      return await this.request("GET", path);
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }
}

/** List endpoints wrap the array in an object whose key varies (appModules, appRpcs...). */
export function listOf(response) {
  if (Array.isArray(response)) return response;
  const value = Object.values(response ?? {}).find(Array.isArray);
  return value ?? [];
}
