import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { KvkClient } from "../kvk-client.js";
import type { Signaal } from "../types.js";
import { toTextResult, toErrorResult } from "../tool-result.js";

const formatSignaal = (s: Signaal): string => {
  const lines = [
    `Signal ID: ${s.signaalId}`,
    `Subscription ID: ${s.abonnementId}`,
    s.kvkNummer ? `KVK number: ${s.kvkNummer}` : null,
    s.vestigingsnummer ? `Vestigingsnummer: ${s.vestigingsnummer}` : null,
    s.type ? `Type: ${s.type}` : null,
    s.registratietijdstip ? `Registration time: ${s.registratietijdstip}` : null,
    s.signaalTijdstip ? `Signal time: ${s.signaalTijdstip}` : null,
    s.omschrijving ? `Description: ${s.omschrijving}` : null,
  ].filter(Boolean);

  if (s.details && Object.keys(s.details).length > 0) {
    lines.push(`Details: ${JSON.stringify(s.details)}`);
  }

  return lines.join("\n");
};

export const registerMutationTools = (server: McpServer, client: KvkClient): void => {
  server.registerTool(
    "list_subscriptions",
    {
      title: "List Mutation Subscriptions",
      description:
        "List all mutation subscriptions (abonnementen) for the KVK Mutatieservice. " +
        "Returns all active subscriptions with their IDs and descriptions.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({}),
    },
    async () => {
      try {
        const response = await client.listAbonnementen();
        const abonnementen = response.abonnementen ?? [];

        if (abonnementen.length === 0) {
          return toTextResult("No subscriptions found.");
        }

        const lines = [`Found ${abonnementen.length} subscription${abonnementen.length !== 1 ? "s" : ""}:`, ""];

        for (const ab of abonnementen) {
          const parts = [
            `ID: ${ab.abonnementId}`,
            ab.naam ? `Name: ${ab.naam}` : null,
            ab.beschrijving ? `Description: ${ab.beschrijving}` : null,
          ].filter(Boolean);
          lines.push(`  - ${parts.join(", ")}`);
        }

        return toTextResult(
          lines.join("\n"),
          { abonnementen } as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "list_signals",
    {
      title: "List Mutation Signals",
      description:
        "List mutation signals (signalen) for a specific subscription. " +
        "Returns a paged list of signals indicating changes to companies or locations.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        abonnementId: z.string().describe("The subscription ID to list signals for."),
        vanaf: z.string().optional().describe("Start datetime (ISO 8601) to filter signals from."),
        tot: z.string().optional().describe("End datetime (ISO 8601) to filter signals until."),
        pagina: z.number().int().min(1).default(1).describe("Page number (starts at 1)."),
        aantal: z.number().int().min(10).max(500).default(100).describe("Number of results per page (10-500)."),
      }),
    },
    async ({ abonnementId, vanaf, tot, pagina, aantal }) => {
      try {
        const response = await client.listSignalen({
          abonnementId,
          vanaf,
          tot,
          pagina,
          aantal,
        });

        const signalen = response.signalen ?? [];

        if (signalen.length === 0) {
          return toTextResult("No signals found for this subscription.");
        }

        const lines = [
          `Found ${response.totaal} signal${response.totaal !== 1 ? "s" : ""} (page ${response.pagina}, ${response.aantal} per page)`,
          "",
        ];

        for (const s of signalen) {
          const parts = [
            `ID: ${s.signaalId}`,
            s.kvkNummer ? `KVK: ${s.kvkNummer}` : null,
            s.type ? `Type: ${s.type}` : null,
            s.omschrijving ?? null,
          ].filter(Boolean);
          lines.push(`  - ${parts.join(", ")}`);
        }

        return toTextResult(
          lines.join("\n"),
          {
            totaal: response.totaal,
            pagina: response.pagina,
            aantal: response.aantal,
            signalen,
          } as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_signal",
    {
      title: "Get Signal Details",
      description:
        "Get the full details of a specific mutation signal (signaal) by subscription ID and signal ID.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        abonnementId: z.string().describe("The subscription ID."),
        signaalId: z.string().describe("The signal ID."),
      }),
    },
    async ({ abonnementId, signaalId }) => {
      try {
        const signaal = await client.getSignaal(abonnementId, signaalId);

        return toTextResult(
          formatSignaal(signaal),
          signaal as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
};
