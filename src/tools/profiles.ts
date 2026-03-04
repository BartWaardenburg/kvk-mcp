import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { KvkClient } from "../kvk-client.js";
import type { Adres, SbiActiviteit } from "../types.js";
import { toTextResult, toErrorResult } from "../tool-result.js";

const formatAdres = (adres: Adres): string => {
  const parts = [
    adres.straatnaam,
    adres.huisnummer !== undefined ? String(adres.huisnummer) : null,
    adres.huisletter,
    adres.huisnummertoevoeging,
  ].filter(Boolean).join("");

  const line2 = [adres.postcode, adres.plaats].filter(Boolean).join(" ");
  const line3 = adres.land && adres.land !== "Nederland" ? adres.land : null;

  return [parts, line2, line3].filter(Boolean).join(", ");
};

const formatActiviteit = (act: SbiActiviteit): string =>
  `${act.sbiCode} - ${act.sbiOmschrijving}${act.indHoofdactiviteit ? " (hoofdactiviteit)" : ""}`;

export const registerProfileTools = (server: McpServer, client: KvkClient): void => {
  server.registerTool(
    "get_company_profile",
    {
      title: "Get Company Profile",
      description:
        "Get the basic profile (basisprofiel) for a company by KVK number. " +
        "Returns company name, registration date, total employees, statutory name, trade names, and SBI activities.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        kvkNummer: z.string().regex(/^\d{8}$/).describe("KVK number (8 digits)."),
      }),
    },
    async ({ kvkNummer }) => {
      try {
        const profiel = await client.getBasisprofiel(kvkNummer);

        const lines = [
          `Company: ${profiel.naam}`,
          `KVK number: ${profiel.kvkNummer}`,
          profiel.statutaireNaam ? `Statutory name: ${profiel.statutaireNaam}` : null,
          profiel.formeleRegistratiedatum ? `Registered: ${profiel.formeleRegistratiedatum}` : null,
          profiel.totaalWerkzamePersonen !== undefined ? `Total employees: ${profiel.totaalWerkzamePersonen}` : null,
          profiel.indNonMailing !== undefined ? `Non-mailing: ${profiel.indNonMailing}` : null,
        ].filter(Boolean);

        if (profiel.handelsnamen && profiel.handelsnamen.length > 0) {
          lines.push("", "Trade names:");
          for (const hn of profiel.handelsnamen) {
            lines.push(`  ${hn.volgorde}. ${hn.naam}`);
          }
        }

        if (profiel.sbiActiviteiten && profiel.sbiActiviteiten.length > 0) {
          lines.push("", "SBI Activities:");
          for (const act of profiel.sbiActiviteiten) {
            lines.push(`  - ${formatActiviteit(act)}`);
          }
        }

        return toTextResult(
          lines.join("\n"),
          profiel as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_location_profile",
    {
      title: "Get Location Profile",
      description:
        "Get the location profile (vestigingsprofiel) by vestigingsnummer. " +
        "Returns location details including address, trade name, websites, SBI activities, and number of employees.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        vestigingsnummer: z.string().regex(/^\d{12}$/).describe("Vestigingsnummer / location number (12 digits)."),
      }),
    },
    async ({ vestigingsnummer }) => {
      try {
        const profiel = await client.getVestigingsprofiel(vestigingsnummer);

        const lines = [
          profiel.eersteHandelsnaam ? `Name: ${profiel.eersteHandelsnaam}` : null,
          `Vestigingsnummer: ${profiel.vestigingsnummer}`,
          `KVK number: ${profiel.kvkNummer}`,
          profiel.indHoofdvestiging !== undefined ? `Main location: ${profiel.indHoofdvestiging}` : null,
          profiel.totaalWerkzamePersonen !== undefined ? `Employees: ${profiel.totaalWerkzamePersonen}` : null,
        ].filter(Boolean);

        if (profiel.adressen && profiel.adressen.length > 0) {
          lines.push("", "Addresses:");
          for (const adres of profiel.adressen) {
            const typeLabel = adres.type ? `(${adres.type}) ` : "";
            lines.push(`  - ${typeLabel}${formatAdres(adres)}`);
          }
        }

        if (profiel.websites && profiel.websites.length > 0) {
          lines.push("", "Websites:");
          for (const site of profiel.websites) {
            lines.push(`  - ${site}`);
          }
        }

        if (profiel.sbiActiviteiten && profiel.sbiActiviteiten.length > 0) {
          lines.push("", "SBI Activities:");
          for (const act of profiel.sbiActiviteiten) {
            lines.push(`  - ${formatActiviteit(act)}`);
          }
        }

        if (profiel.handelsnamen && profiel.handelsnamen.length > 0) {
          lines.push("", "Trade names:");
          for (const hn of profiel.handelsnamen) {
            lines.push(`  ${hn.volgorde}. ${hn.naam}`);
          }
        }

        return toTextResult(
          lines.join("\n"),
          profiel as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_trade_names",
    {
      title: "Get Trade Names",
      description:
        "Get all trade names (handelsnamen) for a company by KVK number. " +
        "Returns the statutory name and all registered trade names with their order.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        kvkNummer: z.string().regex(/^\d{8}$/).describe("KVK number (8 digits)."),
      }),
    },
    async ({ kvkNummer }) => {
      try {
        const naamgeving = await client.getNaamgeving(kvkNummer);

        const lines = [
          `KVK number: ${naamgeving.kvkNummer}`,
          naamgeving.naam ? `Name: ${naamgeving.naam}` : null,
          naamgeving.statutaireNaam ? `Statutory name: ${naamgeving.statutaireNaam}` : null,
        ].filter(Boolean);

        if (naamgeving.handelsnamen && naamgeving.handelsnamen.length > 0) {
          lines.push("", "Trade names:");
          for (const hn of naamgeving.handelsnamen) {
            lines.push(`  ${hn.volgorde}. ${hn.naam}`);
          }
        } else {
          lines.push("", "No trade names registered.");
        }

        return toTextResult(
          lines.join("\n"),
          naamgeving as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
};
