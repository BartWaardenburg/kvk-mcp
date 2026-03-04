import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { KvkClient } from "../kvk-client.js";
import type { SearchResult } from "../types.js";
import { toTextResult, toErrorResult } from "../tool-result.js";

const formatSearchResultAddress = (result: SearchResult): string | null => {
  const adres = result.adres;
  if (!adres) return null;

  if (adres.binnenlandsAdres) {
    const a = adres.binnenlandsAdres;
    const street = [a.straatnaam, a.huisnummer !== undefined ? String(a.huisnummer) : null, a.huisletter]
      .filter(Boolean)
      .join(" ");
    return [street, a.postcode, a.plaats].filter(Boolean).join(", ");
  }

  if (adres.buitenlandsAdres) {
    const a = adres.buitenlandsAdres;
    return [a.straatHuisnummer, a.postcodeWoonplaats, a.land].filter(Boolean).join(", ");
  }

  return null;
};

export const registerSearchTools = (server: McpServer, client: KvkClient): void => {
  server.registerTool(
    "search_companies",
    {
      title: "Search KVK Business Register",
      description:
        "Search the KVK (Kamer van Koophandel) business register by company name, KVK number, RSIN, vestigingsnummer, street name, city, postcode, or type. " +
        "Returns a list of matching companies with basic information including KVK number, name, address, and active status. " +
        "At least one search parameter must be provided. Uses whole-text matching — partial names will not return results.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        naam: z.string().optional().describe("Company or establishment name to search for. Uses whole-text matching."),
        kvkNummer: z.string().regex(/^\d{8}$/).optional().describe("KVK number (8 digits)."),
        rsin: z.string().regex(/^\d{9}$/).optional().describe("RSIN number (9 digits) — Legal Entities and Partnerships Identification Number."),
        vestigingsnummer: z.string().regex(/^\d{12}$/).optional().describe("Vestigingsnummer / location number (12 digits)."),
        straatnaam: z.string().optional().describe("Street name."),
        plaats: z.string().optional().describe("City name."),
        postcode: z.string().optional().describe("Postal code (e.g. 1234AB). Only in combination with huisnummer."),
        huisnummer: z.number().int().min(1).optional().describe("House number. Only in combination with postcode."),
        huisletter: z.string().max(1).optional().describe("House letter suffix. Only in combination with huisnummer."),
        postbusnummer: z.number().int().min(1).optional().describe("PO box number. Only in combination with postcode."),
        type: z.enum(["hoofdvestiging", "nevenvestiging", "rechtspersoon"]).optional().describe("Type of entity: hoofdvestiging (main location), nevenvestiging (branch), or rechtspersoon (legal entity)."),
        InclusiefInactieveRegistraties: z.boolean().optional().describe("Include inactive registrations. Default is false."),
        pagina: z.number().int().min(1).max(1000).default(1).describe("Page number (starts at 1, max 1000)."),
        resultatenPerPagina: z.number().int().min(1).max(100).default(10).describe("Results per page (max 100)."),
      }),
    },
    async ({ naam, kvkNummer, rsin, vestigingsnummer, straatnaam, plaats, postcode, huisnummer, huisletter, postbusnummer, type, InclusiefInactieveRegistraties, pagina, resultatenPerPagina }) => {
      try {
        const hasParam = naam ?? kvkNummer ?? rsin ?? vestigingsnummer ?? straatnaam ?? plaats ?? postcode ?? type;

        if (!hasParam && huisnummer === undefined && postbusnummer === undefined) {
          return toErrorResult(new Error("At least one search parameter must be provided (naam, kvkNummer, rsin, vestigingsnummer, straatnaam, plaats, postcode, or type)."));
        }

        const response = await client.search({
          naam,
          kvkNummer,
          rsin,
          vestigingsnummer,
          straatnaam,
          plaats,
          postcode,
          huisnummer,
          huisletter,
          postbusnummer,
          type,
          InclusiefInactieveRegistraties,
          pagina,
          resultatenPerPagina,
        });

        const results = response.resultaten ?? [];

        if (results.length === 0) {
          return toTextResult("No companies found matching the search criteria.");
        }

        const lines = results.map((r) => {
          const address = formatSearchResultAddress(r);
          const parts = [
            `KVK: ${r.kvkNummer}`,
            r.naam,
            address,
            r.type ? `(${r.type})` : null,
            r.actief === "Nee" ? "[INACTIEF]" : null,
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
