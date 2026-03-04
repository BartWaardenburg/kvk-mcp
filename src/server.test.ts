import { describe, it, expect } from "vitest";
import { createServer, parseToolsets } from "./server.js";
import type { KvkClient } from "./kvk-client.js";

const mockClient = {} as KvkClient;

type RegisteredTool = { annotations?: Record<string, unknown> };
type ServerWithTools = { _registeredTools: Record<string, RegisteredTool> };

const getTools = (toolsets?: Set<string>): Record<string, RegisteredTool> =>
  (createServer(mockClient, toolsets as never) as unknown as ServerWithTools)._registeredTools;

describe("createServer", () => {
  it("creates a server", () => {
    const server = createServer(mockClient);
    expect(server).toBeDefined();
  });

  it("registers all 4 tools", () => {
    const tools = getTools();
    expect(Object.keys(tools)).toHaveLength(4);
  });

  it("registers all expected tool names", () => {
    const tools = getTools();

    const expectedTools = [
      "search_companies",
      "get_company_profile",
      "get_location_profile",
      "get_trade_names",
    ];

    for (const name of expectedTools) {
      expect(name in tools, `Tool "${name}" should be registered`).toBe(true);
    }
  });

  it("all tools have annotations", () => {
    const tools = getTools();

    for (const [name, tool] of Object.entries(tools)) {
      expect(tool.annotations, `Tool "${name}" should have annotations`).toBeDefined();
    }
  });
});

describe("parseToolsets", () => {
  it("returns all toolsets when env is undefined", () => {
    const result = parseToolsets(undefined);
    expect(result.size).toBe(2);
  });

  it("returns all toolsets when env is empty", () => {
    const result = parseToolsets("");
    expect(result.size).toBe(2);
  });

  it("parses a single toolset", () => {
    const result = parseToolsets("search");
    expect(result).toEqual(new Set(["search"]));
  });

  it("parses multiple toolsets", () => {
    const result = parseToolsets("search,profiles");
    expect(result).toEqual(new Set(["search", "profiles"]));
  });

  it("ignores invalid toolset names", () => {
    const result = parseToolsets("search,invalid,profiles");
    expect(result).toEqual(new Set(["search", "profiles"]));
  });

  it("returns all toolsets if all names are invalid", () => {
    const result = parseToolsets("invalid,unknown");
    expect(result.size).toBe(2);
  });

  it("handles whitespace in toolset names", () => {
    const result = parseToolsets(" search , profiles ");
    expect(result).toEqual(new Set(["search", "profiles"]));
  });
});

describe("toolset filtering", () => {
  it("registers only search tools when search toolset is selected", () => {
    const tools = getTools(new Set(["search"]) as never);
    expect("search_companies" in tools).toBe(true);
    expect("get_company_profile" in tools).toBe(false);
    expect("get_location_profile" in tools).toBe(false);
    expect("get_trade_names" in tools).toBe(false);
  });

  it("registers only profile tools when profiles toolset is selected", () => {
    const tools = getTools(new Set(["profiles"]) as never);
    expect("get_company_profile" in tools).toBe(true);
    expect("get_location_profile" in tools).toBe(true);
    expect("get_trade_names" in tools).toBe(true);
    expect("search_companies" in tools).toBe(false);
  });

  it("does not register duplicate tools when all toolsets are selected", () => {
    const tools = getTools(new Set(["search", "profiles"]) as never);
    const toolNames = Object.keys(tools);
    const unique = new Set(toolNames);
    expect(toolNames.length).toBe(unique.size);
  });
});
