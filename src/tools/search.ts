import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { KvkClient } from "../kvk-client.js";
import { toTextResult, toErrorResult } from "../tool-result.js";

export const registerSearchTools = (server: McpServer, client: KvkClient): void => {
  server.registerTool(
    "search_companies",
    {
      title: "Search KVK Business Register",
      description:
        "Search the KVK (Kamer van Koophandel) business register by company name, KVK number, vestigingsnummer, street name, city, postcode, or type. " +
        "Returns a list of matching companies with basic information including KVK number, trade name, address, and active status. " +
        "At least one search parameter must be provided.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        handelsnaam: z.string().optional().describe("Trade name (company name) to search for."),
        kvkNummer: z.string().regex(/^\d{8}$/).optional().describe("KVK number (8 digits)."),
        vestigingsnummer: z.string().regex(/^\d{12}$/).optional().describe("Vestigingsnummer / location number (12 digits)."),
        straatnaam: z.string().optional().describe("Street name."),
        plaats: z.string().optional().describe("City name."),
        postcode: z.string().optional().describe("Postal code (e.g. 1234AB)."),
        type: z.enum(["hoofdvestiging", "nevenvestiging", "rechtspersoon"]).optional().describe("Type of entity: hoofdvestiging (main location), nevenvestiging (branch), or rechtspersoon (legal entity)."),
        pagina: z.number().int().min(1).default(1).describe("Page number (starts at 1)."),
        resultatenPerPagina: z.number().int().min(1).max(100).default(10).describe("Results per page (max 100)."),
      }),
    },
    async ({ handelsnaam, kvkNummer, vestigingsnummer, straatnaam, plaats, postcode, type, pagina, resultatenPerPagina }) => {
      try {
        const hasParam = handelsnaam ?? kvkNummer ?? vestigingsnummer ?? straatnaam ?? plaats ?? postcode ?? type;

        if (!hasParam) {
          return toErrorResult(new Error("At least one search parameter must be provided (handelsnaam, kvkNummer, vestigingsnummer, straatnaam, plaats, postcode, or type)."));
        }

        const response = await client.search({
          handelsnaam,
          kvkNummer,
          vestigingsnummer,
          straatnaam,
          plaats,
          postcode,
          type,
          pagina,
          resultatenPerPagina,
        });

        const results = response.resultaten ?? [];

        if (results.length === 0) {
          return toTextResult("No companies found matching the search criteria.");
        }

        const lines = results.map((r) => {
          const parts = [
            `KVK: ${r.kvkNummer}`,
            r.handelsnaam,
            r.straatnaam ? `${r.straatnaam}${r.huisnummer ? ` ${r.huisnummer}` : ""}` : null,
            r.postcode,
            r.plaats,
            r.type ? `(${r.type})` : null,
            r.actief === false ? "[INACTIEF]" : null,
          ].filter(Boolean);
          return `  - ${parts.join(", ")}`;
        });

        return toTextResult(
          [
            `Found ${response.totaal} result${response.totaal !== 1 ? "s" : ""} (page ${response.pagina}, ${response.resultatenPerPagina} per page)`,
            ...lines,
          ].join("\n"),
          {
            totaal: response.totaal,
            pagina: response.pagina,
            resultatenPerPagina: response.resultatenPerPagina,
            resultaten: results,
          } as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
};
