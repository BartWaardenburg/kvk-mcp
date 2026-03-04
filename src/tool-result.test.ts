import { describe, it, expect } from "vitest";
import { toTextResult, toErrorResult } from "./tool-result.js";
import { KvkApiError } from "./kvk-client.js";

describe("toTextResult", () => {
  it("returns text content", () => {
    const result = toTextResult("hello");
    expect(result).toEqual({
      content: [{ type: "text", text: "hello" }],
    });
  });

  it("includes structured content when provided", () => {
    const result = toTextResult("hello", { key: "value" });
    expect(result).toEqual({
      content: [{ type: "text", text: "hello" }],
      structuredContent: { key: "value" },
    });
  });

  it("omits structuredContent when not provided", () => {
    const result = toTextResult("hello");
    expect(result).not.toHaveProperty("structuredContent");
  });
});

describe("toErrorResult", () => {
  it("formats KvkApiError with status and details", () => {
    const error = new KvkApiError("Not found", 404, { code: "NOT_FOUND" });
    const result = toErrorResult(error);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("KVK API error");
    expect(result.content[0].text).toContain("404");
    expect(result.content[0].text).toContain("NOT_FOUND");
  });

  it("formats KvkApiError without details", () => {
    const error = new KvkApiError("Server error", 500);
    const result = toErrorResult(error);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("500");
    expect(result.content[0].text).not.toContain("Details:");
  });

  it("formats generic Error", () => {
    const result = toErrorResult(new Error("something broke"));

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("something broke");
  });

  it("formats non-Error values", () => {
    const result = toErrorResult("string error");

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("string error");
  });

  // --- Recovery suggestions ---

  it("includes rate limit recovery suggestion for 429", () => {
    const error = new KvkApiError("Rate limit exceeded", 429);
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Recovery:");
    expect(result.content[0].text).toContain("Rate limit exceeded");
  });

  it("includes basisprofiel not found recovery suggestion for 404", () => {
    const error = new KvkApiError("Basisprofiel not found", 404);
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Recovery:");
    expect(result.content[0].text).toContain("KVK number");
    expect(result.content[0].text).toContain("search_companies");
  });

  it("includes company not found recovery suggestion for 404", () => {
    const error = new KvkApiError("Company not found", 404);
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Recovery:");
    expect(result.content[0].text).toContain("8 digits");
    expect(result.content[0].text).toContain("search_companies");
  });

  it("includes vestiging not found recovery suggestion for 404", () => {
    const error = new KvkApiError("Vestiging not found", 404);
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Recovery:");
    expect(result.content[0].text).toContain("vestigingsnummer");
    expect(result.content[0].text).toContain("12 digits");
  });

  it("includes location not found recovery suggestion for 404", () => {
    const error = new KvkApiError("Location not found", 404);
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Recovery:");
    expect(result.content[0].text).toContain("12 digits");
  });

  it("includes generic 404 recovery suggestion", () => {
    const error = new KvkApiError("Not found", 404);
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Recovery:");
    expect(result.content[0].text).toContain("Resource not found");
  });

  it("includes auth recovery suggestion for 401", () => {
    const error = new KvkApiError("Unauthorized", 401);
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Recovery:");
    expect(result.content[0].text).toContain("KVK_API_KEY");
  });

  it("includes auth recovery suggestion for 403", () => {
    const error = new KvkApiError("Forbidden", 403);
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Recovery:");
    expect(result.content[0].text).toContain("KVK_API_KEY");
  });

  it("includes kvknummer validation recovery suggestion for 400", () => {
    const error = new KvkApiError("Bad request", 400, "Invalid kvknummer format");
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Recovery:");
    expect(result.content[0].text).toContain("KVK number");
    expect(result.content[0].text).toContain("8 digits");
  });

  it("includes vestigingsnummer validation recovery suggestion for 400", () => {
    const error = new KvkApiError("Bad request", 400, "Invalid vestigingsnummer");
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Recovery:");
    expect(result.content[0].text).toContain("Vestigingsnummers");
    expect(result.content[0].text).toContain("12 digits");
  });

  it("includes generic 400 recovery suggestion", () => {
    const error = new KvkApiError("Bad request", 400);
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Recovery:");
    expect(result.content[0].text).toContain("search parameter");
  });

  it("includes server error recovery suggestion for 500", () => {
    const error = new KvkApiError("Internal server error", 500);
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Recovery:");
    expect(result.content[0].text).toContain("temporary issue");
  });

  it("includes server error recovery suggestion for 502", () => {
    const error = new KvkApiError("Bad gateway", 502);
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Recovery:");
    expect(result.content[0].text).toContain("temporary issue");
  });

  it("returns no recovery suggestion for unrecognized status codes", () => {
    const error = new KvkApiError("I'm a teapot", 418);
    const result = toErrorResult(error);

    expect(result.content[0].text).not.toContain("Recovery:");
  });

  it("handles 400 with object details containing kvknummer", () => {
    const error = new KvkApiError("Bad request", 400, { field: "kvknummer", message: "invalid" });
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Recovery:");
    expect(result.content[0].text).toContain("8 digits");
  });

  it("handles 400 with null details", () => {
    const error = new KvkApiError("Bad request", 400, null);
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Recovery:");
    expect(result.content[0].text).toContain("search parameter");
  });
});
