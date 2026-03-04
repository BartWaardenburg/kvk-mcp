import { KvkApiError } from "./kvk-client.js";

export const toTextResult = (
  text: string,
  structuredContent?: Record<string, unknown>,
) => ({
  content: [{ type: "text" as const, text }],
  ...(structuredContent ? { structuredContent } : {}),
});

const getRecoverySuggestion = (status: number, message: string, details: unknown): string | null => {
  if (status === 429) {
    return "Rate limit exceeded. Wait a moment and retry, or reduce the frequency of API calls.";
  }

  if (status === 404) {
    const lower = message.toLowerCase();
    if (lower.includes("basisprofiel") || lower.includes("company")) {
      return "Company not found. Verify the KVK number is correct (8 digits). Use search_companies to find the correct KVK number.";
    }
    if (lower.includes("vestiging") || lower.includes("location")) {
      return "Location not found. Verify the vestigingsnummer is correct (12 digits). Use search_companies to find the correct vestigingsnummer.";
    }
    return "Resource not found. Verify the identifier is correct. KVK numbers are 8 digits, vestigingsnummers are 12 digits.";
  }

  if (status === 401 || status === 403) {
    return "Authentication failed. Verify that the KVK_API_KEY environment variable is set correctly and the API key has not expired. Request a key at https://developers.kvk.nl/.";
  }

  if (status === 400) {
    const detailStr = typeof details === "string" ? details : JSON.stringify(details ?? "");
    const lower = detailStr.toLowerCase();
    if (lower.includes("kvknummer")) {
      return "Invalid KVK number. KVK numbers must be exactly 8 digits.";
    }
    if (lower.includes("vestigingsnummer")) {
      return "Invalid vestigingsnummer. Vestigingsnummers must be exactly 12 digits.";
    }
    return "Invalid request. Provide at least one search parameter (handelsnaam, kvkNummer, vestigingsnummer, straatnaam, plaats, or postcode). Check that all values are in the correct format.";
  }

  if (status >= 500) {
    return "KVK API server error. This is a temporary issue on KVK's end. Wait a moment and retry the operation.";
  }

  return null;
};

export const toErrorResult = (error: unknown) => {
  if (error instanceof KvkApiError) {
    const suggestion = getRecoverySuggestion(error.status, error.message, error.details);

    return {
      content: [
        {
          type: "text" as const,
          text: [
            `KVK API error: ${error.message}`,
            `Status: ${error.status}`,
            error.details ? `Details: ${JSON.stringify(error.details, null, 2)}` : "",
            suggestion ? `\nRecovery: ${suggestion}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: error instanceof Error ? error.message : String(error),
      },
    ],
    isError: true,
  };
};
