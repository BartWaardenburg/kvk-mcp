#!/usr/bin/env node

import { createRequire } from "node:module";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { KvkClient } from "./kvk-client.js";
import { createServer, parseToolsets } from "./server.js";
import { checkForUpdate } from "./update-checker.js";

const require = createRequire(import.meta.url);
const { name, version } = require("../package.json") as { name: string; version: string };

const apiKey = process.env.KVK_API_KEY;

if (!apiKey) {
  console.error("Missing required env var: KVK_API_KEY");
  process.exit(1);
}

const cacheTtl = process.env.KVK_CACHE_TTL !== undefined
  ? parseInt(process.env.KVK_CACHE_TTL, 10) * 1000
  : undefined;
const maxRetries = process.env.KVK_MAX_RETRIES !== undefined
  ? parseInt(process.env.KVK_MAX_RETRIES, 10)
  : 3;
const client = new KvkClient(apiKey, undefined, cacheTtl, { maxRetries });
const toolsets = parseToolsets(process.env.KVK_TOOLSETS);
const server = createServer(client, toolsets);

const main = async (): Promise<void> => {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Fire-and-forget — don't block server startup
  void checkForUpdate(name, version);
};

main().catch((error) => {
  console.error("KVK MCP server failed:", error);
  process.exit(1);
});
