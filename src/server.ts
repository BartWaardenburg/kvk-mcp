import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/server";
import type { KvkClient } from "./kvk-client.js";
import { registerSearchTools } from "./tools/search.js";
import { registerProfileTools } from "./tools/profiles.js";
import { registerMutationTools } from "./tools/mutations.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

export type Toolset = "search" | "profiles" | "mutations";

const ALL_TOOLSETS: Toolset[] = ["search", "profiles", "mutations"];

export const parseToolsets = (env?: string): Set<Toolset> => {
  if (!env) return new Set(ALL_TOOLSETS);

  const requested = env.split(",").map((s) => s.trim().toLowerCase());
  const valid = new Set<Toolset>();

  for (const name of requested) {
    if (ALL_TOOLSETS.includes(name as Toolset)) {
      valid.add(name as Toolset);
    }
  }

  return valid.size > 0 ? valid : new Set(ALL_TOOLSETS);
};

const INSTRUCTIONS = [
  "Search and read Dutch company data from the KVK (Kamer van Koophandel) API.",
  "To find a company, call search_companies. Then call get_company_profile with the KVK number.",
  "Use get_company_locations, get_main_location, get_trade_names and get_company_owner for details.",
  "list_subscriptions, list_signals and get_signal read mutation signals.",
  "The server needs the KVK_API_KEY env var. The KVK API limits the request rate.",
].join("\n");

type ToolRegisterer = (server: McpServer, client: KvkClient) => void;

const toolsetRegistry: Record<Toolset, ToolRegisterer[]> = {
  search: [registerSearchTools],
  profiles: [registerProfileTools],
  mutations: [registerMutationTools],
};

export const createServer = (
  client: KvkClient,
  toolsets?: Set<Toolset>,
): McpServer => {
  const server = new McpServer(
    {
      name: "kvk-mcp",
      title: "KVK Handelsregister",
      version,
      websiteUrl: "https://developers.kvk.nl/",
    },
    { instructions: INSTRUCTIONS },
  );

  const enabled = toolsets ?? new Set(ALL_TOOLSETS);
  const registered = new Set<ToolRegisterer>();

  // Iterate the fixed list, not the user input, so tools/list has one stable order.
  for (const toolset of ALL_TOOLSETS.filter((t) => enabled.has(t))) {
    const registerers = toolsetRegistry[toolset];

    for (const register of registerers) {
      if (!registered.has(register)) {
        registered.add(register);
        register(server, client);
      }
    }
  }

  return server;
};
