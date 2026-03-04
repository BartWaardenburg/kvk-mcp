import { describe, it, expect, vi, beforeEach } from "vitest";
import type { KvkClient } from "../kvk-client.js";
import { KvkApiError } from "../kvk-client.js";
import { registerSearchTools } from "./search.js";
import { registerProfileTools } from "./profiles.js";

type ToolHandler = (input: Record<string, unknown>) => Promise<unknown>;

interface ToolResult {
  content: { type: string; text: string }[];
  isError?: boolean;
  structuredContent?: Record<string, unknown>;
}

const createMockServer = () => {
  const handlers = new Map<string, ToolHandler>();
  return {
    registerTool: vi.fn((name: string, _config: unknown, handler: ToolHandler) => {
      handlers.set(name, handler);
    }),
    getHandler: (name: string): ToolHandler => {
      const handler = handlers.get(name);
      if (!handler) throw new Error(`No handler registered for "${name}"`);
      return handler;
    },
  };
};

const apiError = new KvkApiError("API failed", 500, { code: "INTERNAL" });

const createMockClient = (): Record<string, ReturnType<typeof vi.fn>> => ({
  search: vi.fn(),
  getBasisprofiel: vi.fn(),
  getVestigingsprofiel: vi.fn(),
  getNaamgeving: vi.fn(),
});

// --- Search Tools ---

describe("search tools", () => {
  let server: ReturnType<typeof createMockServer>;
  let client: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    server = createMockServer();
    client = createMockClient();
    registerSearchTools(server as never, client as unknown as KvkClient);
  });

  describe("search_companies", () => {
    const handler = () => server.getHandler("search_companies");

    it("returns formatted search results", async () => {
      client.search.mockResolvedValueOnce({
        pagina: 1,
        resultatenPerPagina: 10,
        totaal: 2,
        resultaten: [
          {
            kvkNummer: "12345678",
            naam: "Acme BV",
            type: "hoofdvestiging",
            actief: "Ja",
            adres: {
              binnenlandsAdres: {
                straatnaam: "Keizersgracht",
                huisnummer: 100,
                postcode: "1015AA",
                plaats: "Amsterdam",
              },
            },
          },
          {
            kvkNummer: "87654321",
            naam: "Test NV",
            actief: "Nee",
          },
        ],
      });

      const result = (await handler()({ naam: "Acme", pagina: 1, resultatenPerPagina: 10 })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("Found 2 results");
      expect(result.content[0].text).toContain("Acme BV");
      expect(result.content[0].text).toContain("Keizersgracht");
      expect(result.content[0].text).toContain("Amsterdam");
      expect(result.content[0].text).toContain("(hoofdvestiging)");
      expect(result.content[0].text).toContain("[INACTIEF]");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns message when no results found", async () => {
      client.search.mockResolvedValueOnce({
        pagina: 1,
        resultatenPerPagina: 10,
        totaal: 0,
        resultaten: [],
      });

      const result = (await handler()({ naam: "nonexistent", pagina: 1, resultatenPerPagina: 10 })) as ToolResult;

      expect(result.content[0].text).toContain("No companies found");
    });

    it("returns error when no search params provided", async () => {
      const result = (await handler()({ pagina: 1, resultatenPerPagina: 10 })) as ToolResult;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("At least one search parameter");
    });

    it("handles API errors", async () => {
      client.search.mockRejectedValueOnce(apiError);

      const result = (await handler()({ naam: "test", pagina: 1, resultatenPerPagina: 10 })) as ToolResult;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("KVK API error");
    });

    it("handles foreign address format", async () => {
      client.search.mockResolvedValueOnce({
        pagina: 1,
        resultatenPerPagina: 10,
        totaal: 1,
        resultaten: [
          {
            kvkNummer: "12345678",
            naam: "Foreign BV",
            adres: {
              buitenlandsAdres: {
                straatHuisnummer: "123 Main St",
                postcodeWoonplaats: "10001 New York",
                land: "Verenigde Staten",
              },
            },
          },
        ],
      });

      const result = (await handler()({ naam: "Foreign", pagina: 1, resultatenPerPagina: 10 })) as ToolResult;

      expect(result.content[0].text).toContain("123 Main St");
      expect(result.content[0].text).toContain("Verenigde Staten");
    });

    it("handles results without address", async () => {
      client.search.mockResolvedValueOnce({
        pagina: 1,
        resultatenPerPagina: 10,
        totaal: 1,
        resultaten: [
          {
            kvkNummer: "12345678",
            naam: "No Address BV",
          },
        ],
      });

      const result = (await handler()({ naam: "No Address", pagina: 1, resultatenPerPagina: 10 })) as ToolResult;

      expect(result.content[0].text).toContain("No Address BV");
      expect(result.content[0].text).toContain("Found 1 result");
    });

    it("returns singular result text for single match", async () => {
      client.search.mockResolvedValueOnce({
        pagina: 1,
        resultatenPerPagina: 10,
        totaal: 1,
        resultaten: [{ kvkNummer: "12345678", naam: "Single BV" }],
      });

      const result = (await handler()({ naam: "Single", pagina: 1, resultatenPerPagina: 10 })) as ToolResult;

      expect(result.content[0].text).toContain("Found 1 result ");
    });

    it("handles null resultaten in response", async () => {
      client.search.mockResolvedValueOnce({
        pagina: 1,
        resultatenPerPagina: 10,
        totaal: 0,
      });

      const result = (await handler()({ naam: "test", pagina: 1, resultatenPerPagina: 10 })) as ToolResult;

      expect(result.content[0].text).toContain("No companies found");
    });
  });
});

// --- Profile Tools ---

describe("profile tools", () => {
  let server: ReturnType<typeof createMockServer>;
  let client: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    server = createMockServer();
    client = createMockClient();
    registerProfileTools(server as never, client as unknown as KvkClient);
  });

  describe("get_company_profile", () => {
    const handler = () => server.getHandler("get_company_profile");

    it("returns formatted company profile", async () => {
      client.getBasisprofiel.mockResolvedValueOnce({
        kvkNummer: "12345678",
        naam: "Test BV",
        statutaireNaam: "Test Besloten Vennootschap",
        formeleRegistratiedatum: "2020-01-15",
        totaalWerkzamePersonen: 42,
        indNonMailing: "Nee",
        handelsnamen: [
          { naam: "Test BV", volgorde: 1 },
          { naam: "Test Trading", volgorde: 2 },
        ],
        sbiActiviteiten: [
          { sbiCode: "6201", sbiOmschrijving: "Ontwikkeling van software", indHoofdactiviteit: "Ja" },
          { sbiCode: "6202", sbiOmschrijving: "Advisering op IT-gebied", indHoofdactiviteit: "Nee" },
        ],
      });

      const result = (await handler()({ kvkNummer: "12345678" })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("Company: Test BV");
      expect(result.content[0].text).toContain("KVK number: 12345678");
      expect(result.content[0].text).toContain("Statutory name: Test Besloten Vennootschap");
      expect(result.content[0].text).toContain("Registered: 2020-01-15");
      expect(result.content[0].text).toContain("Total employees: 42");
      expect(result.content[0].text).toContain("Non-mailing: Nee");
      expect(result.content[0].text).toContain("Trade names:");
      expect(result.content[0].text).toContain("1. Test BV");
      expect(result.content[0].text).toContain("2. Test Trading");
      expect(result.content[0].text).toContain("SBI Activities:");
      expect(result.content[0].text).toContain("6201 - Ontwikkeling van software (hoofdactiviteit)");
      expect(result.content[0].text).toContain("6202 - Advisering op IT-gebied");
      expect(result.structuredContent).toBeDefined();
    });

    it("handles minimal company profile", async () => {
      client.getBasisprofiel.mockResolvedValueOnce({
        kvkNummer: "12345678",
        naam: "Minimal BV",
      });

      const result = (await handler()({ kvkNummer: "12345678" })) as ToolResult;

      expect(result.content[0].text).toContain("Company: Minimal BV");
      expect(result.content[0].text).not.toContain("Trade names:");
      expect(result.content[0].text).not.toContain("SBI Activities:");
    });

    it("handles API errors", async () => {
      client.getBasisprofiel.mockRejectedValueOnce(apiError);

      const result = (await handler()({ kvkNummer: "12345678" })) as ToolResult;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("KVK API error");
    });
  });

  describe("get_location_profile", () => {
    const handler = () => server.getHandler("get_location_profile");

    it("returns formatted location profile", async () => {
      client.getVestigingsprofiel.mockResolvedValueOnce({
        vestigingsnummer: "000012345678",
        kvkNummer: "12345678",
        eersteHandelsnaam: "Test Vestiging",
        indHoofdvestiging: "Ja",
        totaalWerkzamePersonen: 15,
        adressen: [
          {
            type: "bezoekadres",
            volledigAdres: "Keizersgracht 100, 1015AA Amsterdam",
          },
        ],
        websites: ["https://example.com"],
        sbiActiviteiten: [
          { sbiCode: "6201", sbiOmschrijving: "Software ontwikkeling", indHoofdactiviteit: "Ja" },
        ],
        handelsnamen: [
          { naam: "Test Vestiging", volgorde: 1 },
        ],
      });

      const result = (await handler()({ vestigingsnummer: "000012345678" })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("Name: Test Vestiging");
      expect(result.content[0].text).toContain("Vestigingsnummer: 000012345678");
      expect(result.content[0].text).toContain("KVK number: 12345678");
      expect(result.content[0].text).toContain("Main location: Ja");
      expect(result.content[0].text).toContain("Employees: 15");
      expect(result.content[0].text).toContain("Addresses:");
      expect(result.content[0].text).toContain("(bezoekadres)");
      expect(result.content[0].text).toContain("Keizersgracht 100, 1015AA Amsterdam");
      expect(result.content[0].text).toContain("Websites:");
      expect(result.content[0].text).toContain("https://example.com");
      expect(result.content[0].text).toContain("SBI Activities:");
      expect(result.content[0].text).toContain("Trade names:");
      expect(result.structuredContent).toBeDefined();
    });

    it("formats address from parts when volledigAdres is not available", async () => {
      client.getVestigingsprofiel.mockResolvedValueOnce({
        vestigingsnummer: "000012345678",
        kvkNummer: "12345678",
        adressen: [
          {
            straatnaam: "Herengracht",
            huisnummer: 50,
            huisletter: "A",
            huisnummerToevoeging: "bis",
            postcode: "1015BN",
            plaats: "Amsterdam",
          },
        ],
      });

      const result = (await handler()({ vestigingsnummer: "000012345678" })) as ToolResult;

      expect(result.content[0].text).toContain("Herengracht 50 A bis");
      expect(result.content[0].text).toContain("1015BN Amsterdam");
    });

    it("formats foreign address with country", async () => {
      client.getVestigingsprofiel.mockResolvedValueOnce({
        vestigingsnummer: "000012345678",
        kvkNummer: "12345678",
        adressen: [
          {
            straatnaam: "Rue de la Paix",
            huisnummer: 5,
            postcode: "75002",
            plaats: "Paris",
            land: "Frankrijk",
          },
        ],
      });

      const result = (await handler()({ vestigingsnummer: "000012345678" })) as ToolResult;

      expect(result.content[0].text).toContain("Frankrijk");
    });

    it("omits country when it is Nederland", async () => {
      client.getVestigingsprofiel.mockResolvedValueOnce({
        vestigingsnummer: "000012345678",
        kvkNummer: "12345678",
        adressen: [
          {
            straatnaam: "Keizersgracht",
            huisnummer: 100,
            postcode: "1015AA",
            plaats: "Amsterdam",
            land: "Nederland",
          },
        ],
      });

      const result = (await handler()({ vestigingsnummer: "000012345678" })) as ToolResult;

      expect(result.content[0].text).not.toContain("Nederland");
    });

    it("handles minimal location profile", async () => {
      client.getVestigingsprofiel.mockResolvedValueOnce({
        vestigingsnummer: "000012345678",
        kvkNummer: "12345678",
      });

      const result = (await handler()({ vestigingsnummer: "000012345678" })) as ToolResult;

      expect(result.content[0].text).toContain("Vestigingsnummer: 000012345678");
      expect(result.content[0].text).not.toContain("Addresses:");
      expect(result.content[0].text).not.toContain("Websites:");
      expect(result.content[0].text).not.toContain("SBI Activities:");
    });

    it("handles API errors", async () => {
      client.getVestigingsprofiel.mockRejectedValueOnce(apiError);

      const result = (await handler()({ vestigingsnummer: "000012345678" })) as ToolResult;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("KVK API error");
    });
  });

  describe("get_trade_names", () => {
    const handler = () => server.getHandler("get_trade_names");

    it("returns formatted trade names with commerciele vestigingen", async () => {
      client.getNaamgeving.mockResolvedValueOnce({
        kvkNummer: "12345678",
        naam: "Test BV",
        statutaireNaam: "Test Besloten Vennootschap",
        ookGenoemd: "Test Company",
        vestigingen: [
          {
            vestigingsnummer: "000012345678",
            eersteHandelsnaam: "Test Hoofdvestiging",
            handelsnamen: [
              { naam: "Test Hoofdvestiging", volgorde: 1 },
              { naam: "Test Trading", volgorde: 2 },
            ],
          },
        ],
      });

      const result = (await handler()({ kvkNummer: "12345678" })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("KVK number: 12345678");
      expect(result.content[0].text).toContain("Name: Test BV");
      expect(result.content[0].text).toContain("Statutory name: Test Besloten Vennootschap");
      expect(result.content[0].text).toContain("Also known as: Test Company");
      expect(result.content[0].text).toContain("Vestigingen:");
      expect(result.content[0].text).toContain("Vestigingsnummer: 000012345678");
      expect(result.content[0].text).toContain("First trade name: Test Hoofdvestiging");
      expect(result.content[0].text).toContain("1. Test Hoofdvestiging");
      expect(result.content[0].text).toContain("2. Test Trading");
      expect(result.structuredContent).toBeDefined();
    });

    it("handles niet-commerciele vestigingen", async () => {
      client.getNaamgeving.mockResolvedValueOnce({
        kvkNummer: "12345678",
        vestigingen: [
          {
            vestigingsnummer: "000012345678",
            naam: "Niet-commerciele Vestiging",
          },
        ],
      });

      const result = (await handler()({ kvkNummer: "12345678" })) as ToolResult;

      expect(result.content[0].text).toContain("Name: Niet-commerciele Vestiging");
    });

    it("handles no vestigingen", async () => {
      client.getNaamgeving.mockResolvedValueOnce({
        kvkNummer: "12345678",
      });

      const result = (await handler()({ kvkNummer: "12345678" })) as ToolResult;

      expect(result.content[0].text).toContain("No vestigingen with trade names registered");
    });

    it("handles empty vestigingen array", async () => {
      client.getNaamgeving.mockResolvedValueOnce({
        kvkNummer: "12345678",
        vestigingen: [],
      });

      const result = (await handler()({ kvkNummer: "12345678" })) as ToolResult;

      expect(result.content[0].text).toContain("No vestigingen with trade names registered");
    });

    it("handles minimal naamgeving response", async () => {
      client.getNaamgeving.mockResolvedValueOnce({
        kvkNummer: "12345678",
      });

      const result = (await handler()({ kvkNummer: "12345678" })) as ToolResult;

      expect(result.content[0].text).toContain("KVK number: 12345678");
      expect(result.content[0].text).not.toContain("Statutory name:");
      expect(result.content[0].text).not.toContain("Also known as:");
    });

    it("handles API errors", async () => {
      client.getNaamgeving.mockRejectedValueOnce(apiError);

      const result = (await handler()({ kvkNummer: "12345678" })) as ToolResult;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("KVK API error");
    });

    it("handles commerciele vestiging without handelsnamen", async () => {
      client.getNaamgeving.mockResolvedValueOnce({
        kvkNummer: "12345678",
        vestigingen: [
          {
            vestigingsnummer: "000012345678",
            eersteHandelsnaam: "Only First Name",
          },
        ],
      });

      const result = (await handler()({ kvkNummer: "12345678" })) as ToolResult;

      expect(result.content[0].text).toContain("First trade name: Only First Name");
      expect(result.content[0].text).not.toContain("Trade names:");
    });
  });
});
