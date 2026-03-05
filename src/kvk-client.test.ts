import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { KvkClient, KvkApiError } from "./kvk-client.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const jsonResponse = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("KvkClient", () => {
  let client: KvkClient;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    mockFetch.mockReset();
    client = new KvkClient("test-api-key", "https://api.test.com");
  });

  describe("request building", () => {
    it("sends apikey header on every request", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ resultaten: [], totaal: 0 }));

      await client.search({ naam: "test" });

      const [, init] = mockFetch.mock.calls[0];
      const headers = init.headers as Headers;
      expect(headers.get("apikey")).toBe("test-api-key");
      expect(headers.get("Content-Type")).toBe("application/json");
    });

    it("strips trailing slash from baseUrl", () => {
      const c = new KvkClient("key", "https://api.test.com/");
      mockFetch.mockResolvedValueOnce(jsonResponse({ resultaten: [] }));
      void c.search({ naam: "test" });
      const [url] = mockFetch.mock.calls[0];
      expect(url).toMatch(/^https:\/\/api\.test\.com\/v2\//);
    });

    it("encodes special characters in URL path", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}));

      await client.getBasisprofiel("12345678");

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/v1/basisprofielen/12345678");
    });
  });

  describe("search", () => {
    it("builds query string from search params", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ resultaten: [], totaal: 0 }));

      await client.search({ naam: "Acme", kvkNummer: "12345678" });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("naam=Acme");
      expect(url).toContain("kvkNummer=12345678");
    });

    it("omits undefined params from query string", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ resultaten: [], totaal: 0 }));

      await client.search({ naam: "Acme" });

      const [url] = mockFetch.mock.calls[0];
      expect(url).not.toContain("kvkNummer");
      expect(url).not.toContain("rsin");
    });

    it("includes numeric params when set", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ resultaten: [], totaal: 0 }));

      await client.search({ postcode: "1234AB", huisnummer: 10, pagina: 2, resultatenPerPagina: 25 });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("huisnummer=10");
      expect(url).toContain("pagina=2");
      expect(url).toContain("resultatenPerPagina=25");
    });

    it("includes boolean params", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ resultaten: [], totaal: 0 }));

      await client.search({ naam: "test", inclusiefInactieveRegistraties: true });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("inclusiefInactieveRegistraties=true");
    });

    it("appends multiple type params", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ resultaten: [], totaal: 0 }));

      await client.search({ naam: "test", type: ["hoofdvestiging", "nevenvestiging"] });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("type=hoofdvestiging");
      expect(url).toContain("type=nevenvestiging");
    });

    it("caches search results", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ resultaten: [], totaal: 0 }));

      await client.search({ naam: "test" });
      await client.search({ naam: "test" });

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("does not use cache for different params", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ resultaten: [], totaal: 0 }));

      await client.search({ naam: "test" });
      await client.search({ naam: "other" });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("getBasisprofiel", () => {
    it("fetches basisprofiel by kvkNummer", async () => {
      const profiel = { kvkNummer: "12345678", naam: "Test BV" };
      mockFetch.mockResolvedValueOnce(jsonResponse(profiel));

      const result = await client.getBasisprofiel("12345678");

      expect(result).toEqual(profiel);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/v1/basisprofielen/12345678");
    });

    it("appends geoData query param when true", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ kvkNummer: "12345678" }));

      await client.getBasisprofiel("12345678", true);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("?geoData=true");
    });

    it("does not append geoData when false or undefined", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ kvkNummer: "12345678" }));

      await client.getBasisprofiel("12345678");

      const [url] = mockFetch.mock.calls[0];
      expect(url).not.toContain("geoData");
    });

    it("caches basisprofiel results", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ kvkNummer: "12345678" }));

      await client.getBasisprofiel("12345678");
      await client.getBasisprofiel("12345678");

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("uses separate cache keys for geoData true/false", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ kvkNummer: "12345678" }));

      await client.getBasisprofiel("12345678", false);
      await client.getBasisprofiel("12345678", true);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("getVestigingsprofiel", () => {
    it("fetches vestigingsprofiel by vestigingsnummer", async () => {
      const profiel = { vestigingsnummer: "000012345678", kvkNummer: "12345678" };
      mockFetch.mockResolvedValueOnce(jsonResponse(profiel));

      const result = await client.getVestigingsprofiel("000012345678");

      expect(result).toEqual(profiel);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/v1/vestigingsprofielen/000012345678");
    });

    it("appends geoData query param when true", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ vestigingsnummer: "000012345678" }));

      await client.getVestigingsprofiel("000012345678", true);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("?geoData=true");
    });

    it("caches vestigingsprofiel results", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ vestigingsnummer: "000012345678" }));

      await client.getVestigingsprofiel("000012345678");
      await client.getVestigingsprofiel("000012345678");

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("getEigenaar", () => {
    it("fetches eigenaar by kvkNummer", async () => {
      const eigenaar = { rsin: "123456789", rechtsvorm: "BV" };
      mockFetch.mockResolvedValueOnce(jsonResponse(eigenaar));

      const result = await client.getEigenaar("12345678");

      expect(result).toEqual(eigenaar);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/v1/basisprofielen/12345678/eigenaar");
    });

    it("appends geoData when true", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}));

      await client.getEigenaar("12345678", true);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("?geoData=true");
    });
  });

  describe("getHoofdvestiging", () => {
    it("fetches hoofdvestiging by kvkNummer", async () => {
      const vestiging = { vestigingsnummer: "000012345678", kvkNummer: "12345678" };
      mockFetch.mockResolvedValueOnce(jsonResponse(vestiging));

      const result = await client.getHoofdvestiging("12345678");

      expect(result).toEqual(vestiging);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/v1/basisprofielen/12345678/hoofdvestiging");
    });

    it("appends geoData when true", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}));

      await client.getHoofdvestiging("12345678", true);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("?geoData=true");
    });
  });

  describe("getVestigingen", () => {
    it("fetches vestigingen list by kvkNummer", async () => {
      const list = { kvkNummer: "12345678", totaalAantalVestigingen: 2, vestigingen: [] };
      mockFetch.mockResolvedValueOnce(jsonResponse(list));

      const result = await client.getVestigingen("12345678");

      expect(result).toEqual(list);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/v1/basisprofielen/12345678/vestigingen");
    });
  });

  describe("listAbonnementen", () => {
    it("fetches abonnementen list", async () => {
      const response = { abonnementen: [{ abonnementId: "ab1" }] };
      mockFetch.mockResolvedValueOnce(jsonResponse(response));

      const result = await client.listAbonnementen();

      expect(result).toEqual(response);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/v1/abonnementen");
    });
  });

  describe("listSignalen", () => {
    it("fetches signalen with query params", async () => {
      const response = { pagina: 1, aantal: 100, totaal: 1, signalen: [] };
      mockFetch.mockResolvedValueOnce(jsonResponse(response));

      await client.listSignalen({
        abonnementId: "ab1",
        vanaf: "2025-01-01T00:00:00Z",
        tot: "2025-12-31T23:59:59Z",
        pagina: 2,
        aantal: 50,
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/v1/abonnementen/ab1");
      expect(url).toContain("vanaf=");
      expect(url).toContain("pagina=2");
      expect(url).toContain("aantal=50");
    });

    it("omits optional params when not provided", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ signalen: [] }));

      await client.listSignalen({ abonnementId: "ab1" });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/v1/abonnementen/ab1");
      expect(url).not.toContain("vanaf");
      expect(url).not.toContain("pagina");
    });
  });

  describe("getSignaal", () => {
    it("fetches a single signaal", async () => {
      const signaal = { signaalId: "s1", abonnementId: "ab1" };
      mockFetch.mockResolvedValueOnce(jsonResponse(signaal));

      const result = await client.getSignaal("ab1", "s1");

      expect(result).toEqual(signaal);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/v1/abonnementen/ab1/signalen/s1");
    });
  });

  describe("getNaamgeving", () => {
    it("fetches naamgeving by kvkNummer", async () => {
      const naamgeving = { kvkNummer: "12345678", naam: "Test BV" };
      mockFetch.mockResolvedValueOnce(jsonResponse(naamgeving));

      const result = await client.getNaamgeving("12345678");

      expect(result).toEqual(naamgeving);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/v1/naamgevingen/kvknummer/12345678");
    });

    it("caches naamgeving results", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ kvkNummer: "12345678" }));

      await client.getNaamgeving("12345678");
      await client.getNaamgeving("12345678");

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("error handling", () => {
    it("throws KvkApiError on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
          statusText: "Not Found",
          headers: { "content-type": "application/json" },
        }),
      );

      await expect(client.getBasisprofiel("99999999")).rejects.toThrow(KvkApiError);
    });

    it("includes status code in thrown error", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Bad request" }), {
          status: 400,
          statusText: "Bad Request",
          headers: { "content-type": "application/json" },
        }),
      );

      try {
        await client.search({ naam: "test" });
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(KvkApiError);
        expect((error as KvkApiError).status).toBe(400);
      }
    });

    it("includes parsed body as details", async () => {
      const errorBody = { message: "Invalid parameter", code: "INVALID" };
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(errorBody), {
          status: 400,
          statusText: "Bad Request",
          headers: { "content-type": "application/json" },
        }),
      );

      try {
        await client.search({ naam: "test" });
        expect.fail("Should have thrown");
      } catch (error) {
        expect((error as KvkApiError).details).toEqual(errorBody);
      }
    });

    it("handles text error responses", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response("Server error", {
          status: 500,
          statusText: "Internal Server Error",
          headers: { "content-type": "text/plain" },
        }),
      );

      try {
        await client.getBasisprofiel("12345678");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(KvkApiError);
        expect((error as KvkApiError).status).toBe(500);
        expect((error as KvkApiError).details).toBe("Server error");
      }
    });
  });

  describe("retry on 429", () => {
    it("retries on 429 with exponential backoff", async () => {
      vi.useFakeTimers();

      const rateLimited = new Response(null, {
        status: 429,
        statusText: "Too Many Requests",
      });
      const success = jsonResponse({ kvkNummer: "12345678" });

      mockFetch.mockResolvedValueOnce(rateLimited).mockResolvedValueOnce(success);

      const promise = client.getBasisprofiel("12345678");

      // Advance past the first retry delay (2^0 * 1000 = 1000ms)
      await vi.advanceTimersByTimeAsync(1001);

      const result = await promise;
      expect(result).toEqual({ kvkNummer: "12345678" });
      expect(mockFetch).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it("uses retry-after header when provided", async () => {
      vi.useFakeTimers();

      const rateLimited = new Response(null, {
        status: 429,
        statusText: "Too Many Requests",
        headers: { "retry-after": "2" },
      });
      const success = jsonResponse({ kvkNummer: "12345678" });

      mockFetch.mockResolvedValueOnce(rateLimited).mockResolvedValueOnce(success);

      const promise = client.getBasisprofiel("12345678");

      // retry-after: 2 means 2000ms
      await vi.advanceTimersByTimeAsync(2001);

      const result = await promise;
      expect(result).toEqual({ kvkNummer: "12345678" });

      vi.useRealTimers();
    });

    it("throws after max retries on persistent 429", async () => {
      const noRetryClient = new KvkClient("test-api-key", "https://api.test.com", undefined, { maxRetries: 0 });

      mockFetch.mockResolvedValueOnce(
        new Response(null, {
          status: 429,
          statusText: "Too Many Requests",
        }),
      );

      await expect(noRetryClient.getBasisprofiel("12345678")).rejects.toThrow(KvkApiError);
    });
  });

  describe("caching disabled", () => {
    it("does not cache when cacheTtlMs is 0", async () => {
      const uncachedClient = new KvkClient("key", "https://api.test.com", 0);
      mockFetch.mockResolvedValue(jsonResponse({ resultaten: [], totaal: 0 }));

      await uncachedClient.search({ naam: "test" });
      await uncachedClient.search({ naam: "test" });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
