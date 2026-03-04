# kvk-mcp

[![npm version](https://img.shields.io/npm/v/kvk-mcp.svg)](https://www.npmjs.com/package/kvk-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-compatible-purple.svg)](https://modelcontextprotocol.io)
[![CI](https://github.com/bartwaardenburg/kvk-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/bartwaardenburg/kvk-mcp/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/BartWaardenburg/94cbbeb22ca67c47c0b8822624f77750/raw/kvk-mcp-coverage.json)](https://bartwaardenburg.github.io/kvk-mcp/)

A community-built [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for the [KVK API](https://developers.kvk.nl/) (Kamer van Koophandel / Dutch Chamber of Commerce). Search the Handelsregister, retrieve company profiles, location details, and trade names — all through natural language via any MCP-compatible AI client.

> **Note:** This is an unofficial, community-maintained project and is not affiliated with or endorsed by KVK.

## Features

- **4 tools** across 2 categories covering the KVK Handelsregister APIs
- **Company search** — find businesses by name, KVK number, RSIN, address, postal code, city, or entity type
- **Basic company profiles** — registration date, legal form, trade names, SBI activity codes, employee count
- **Location profiles** — branch addresses, business activities, contact details, commercial indicators
- **Trade name lookups** — statutory names, alternate trade names, and non-commercial designations
- **Input validation** via Zod schemas on every tool for safe, predictable operations
- **Response caching** with configurable TTL (300s for search, 600s for profiles — register data changes infrequently)
- **Rate limit handling** with exponential backoff and `Retry-After` header support
- **Toolset filtering** to expose only the tool categories you need
- **Docker support** for containerized deployments via GHCR
- **Actionable error messages** with context-aware recovery suggestions

## Supported Clients

This MCP server works with any client that supports the Model Context Protocol, including:

| Client | Easiest install |
|---|---|
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | One-liner: `claude mcp add` |
| [Codex CLI](https://github.com/openai/codex) (OpenAI) | One-liner: `codex mcp add` |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) (Google) | One-liner: `gemini mcp add` |
| [VS Code](https://code.visualstudio.com/) (Copilot) | Command Palette: `MCP: Add Server` |
| [Claude Desktop](https://claude.ai/download) | JSON config file |
| [Cursor](https://cursor.com) | JSON config file |
| [Windsurf](https://codeium.com/windsurf) | JSON config file |
| [Cline](https://github.com/cline/cline) | UI settings |
| [Zed](https://zed.dev) | JSON settings file |

## Installation

### Claude Code

```bash
claude mcp add --scope user kvk-mcp \
  --env KVK_API_KEY=your-api-key \
  -- npx -y kvk-mcp
```

### Codex CLI (OpenAI)

```bash
codex mcp add kvk-mcp \
  --env KVK_API_KEY=your-api-key \
  -- npx -y kvk-mcp
```

### Gemini CLI (Google)

```bash
gemini mcp add kvk-mcp -- npx -y kvk-mcp
```

Set environment variable `KVK_API_KEY` separately via `~/.gemini/settings.json`.

### VS Code (Copilot)

Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) > `MCP: Add Server` > select **Command (stdio)**.

Or add to `.vscode/mcp.json` in your project directory:

```json
{
  "servers": {
    "kvk-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "kvk-mcp"],
      "env": {
        "KVK_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Claude Desktop / Cursor / Windsurf / Cline

These clients share the same JSON format. Add the config below to the appropriate file:

| Client | Config file |
|---|---|
| Claude Desktop (macOS) | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Claude Desktop (Windows) | `%APPDATA%\Claude\claude_desktop_config.json` |
| Cursor (project) | `.cursor/mcp.json` |
| Cursor (global) | `~/.cursor/mcp.json` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` |
| Cline | Settings > MCP Servers > Edit |

```json
{
  "mcpServers": {
    "kvk-mcp": {
      "command": "npx",
      "args": ["-y", "kvk-mcp"],
      "env": {
        "KVK_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Zed

Add to your Zed settings (`~/.zed/settings.json` on macOS, `~/.config/zed/settings.json` on Linux):

```json
{
  "context_servers": {
    "kvk-mcp": {
      "command": "npx",
      "args": ["-y", "kvk-mcp"],
      "env": {
        "KVK_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Docker

```bash
docker run -i --rm \
  -e KVK_API_KEY=your-api-key \
  ghcr.io/bartwaardenburg/kvk-mcp
```

### Codex CLI (TOML config alternative)

If you prefer editing `~/.codex/config.toml` directly:

```toml
[mcp_servers.kvk-mcp]
command = "npx"
args = ["-y", "kvk-mcp"]
env = { "KVK_API_KEY" = "your-api-key" }
```

### Other MCP Clients

For any MCP-compatible client, use this server configuration:

- **Command:** `npx`
- **Args:** `["-y", "kvk-mcp"]`
- **Environment variables:** `KVK_API_KEY`

## Configuration

### Required

| Variable | Description |
|---|---|
| `KVK_API_KEY` | Your KVK API key |

Get your API key from the [KVK Developer Portal](https://developers.kvk.nl/). You need to register and subscribe to the APIs you want to use.

### Optional

| Variable | Description | Default |
|---|---|---|
| `KVK_CACHE_TTL` | Response cache lifetime in seconds. Set to `0` to disable caching. | `120` |
| `KVK_MAX_RETRIES` | Maximum retry attempts for rate-limited (429) requests with exponential backoff. | `3` |
| `KVK_TOOLSETS` | Comma-separated list of tool categories to enable (see [Toolset Filtering](#toolset-filtering)). | All toolsets |

## API Key Setup

### Creating Your API Key

1. Register at the [KVK Developer Portal](https://developers.kvk.nl/)
2. Navigate to **API's aanvragen** (Request APIs)
3. Subscribe to the APIs you need:
   - **Zoeken API** (Search) — required for `search_companies`
   - **Basisprofiel API** — required for `get_company_profile`
   - **Vestigingsprofiel API** — required for `get_location_profile`
   - **Naamgeving API** — required for `get_trade_names`
4. Your API key will be generated after approval

### API Subscriptions Per Tool

| API Subscription | Tools |
|---|---|
| **Zoeken** (Search) | `search_companies` |
| **Basisprofiel** (Basic Profile) | `get_company_profile` |
| **Vestigingsprofiel** (Location Profile) | `get_location_profile` |
| **Naamgeving** (Trade Names) | `get_trade_names` |

## Available Tools

### Search

| Tool | Description |
|---|---|
| `search_companies` | Search the KVK business register by company name, KVK number, RSIN, street, house number, postal code, city, or entity type. Returns up to 100 results per page. |

### Profiles

| Tool | Description |
|---|---|
| `get_company_profile` | Get the basic company profile (basisprofiel) by KVK number — includes statutory name, trade names, registration dates, SBI activity codes, employee count, legal form, and main branch details |
| `get_location_profile` | Get a location profile (vestigingsprofiel) by vestigingsnummer — includes full address, business activities, employee breakdown, website, and commercial indicators |
| `get_trade_names` | Get all trade names (handelsnamen) for a KVK number — includes statutory name, commercial and non-commercial designations per branch |

## Toolset Filtering

Reduce context window usage by enabling only the tool categories you need. Set the `KVK_TOOLSETS` environment variable to a comma-separated list:

```bash
KVK_TOOLSETS=search
```

| Toolset | Tools included |
|---|---|
| `search` | Company search in the Handelsregister |
| `profiles` | Basic profiles, location profiles, and trade names |

When not set, all toolsets are enabled. Invalid names are ignored; if all names are invalid, all toolsets are enabled as a fallback.

## Key Identifiers

| Identifier | Format | Description |
|---|---|---|
| **KVK nummer** | 8 digits (e.g. `12345678`) | Unique company registration number |
| **Vestigingsnummer** | 12 digits (e.g. `000012345678`) | Unique branch/location number |
| **RSIN** | 9 digits (e.g. `123456789`) | Legal entity identifier (Rechtspersonen en Samenwerkingsverbanden Identificatienummer) |

## Example Usage

Once connected, you can interact with the KVK API using natural language:

- "Search for companies named 'Acme' in Amsterdam"
- "Look up KVK number 12345678"
- "Show me the company profile for KVK 69599084"
- "What are the business activities (SBI codes) for this company?"
- "Get the location details for vestigingsnummer 000012345678"
- "What trade names does KVK 12345678 use?"
- "Find all active companies on Herengracht in Amsterdam"
- "How many employees does this company have?"

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck
```

### Project Structure

```
src/
  index.ts              # Entry point (stdio transport)
  server.ts             # MCP server setup and toolset filtering
  kvk-client.ts         # KVK API HTTP client with caching and retry
  cache.ts              # TTL-based in-memory response cache
  types.ts              # TypeScript interfaces for KVK API
  tool-result.ts        # Error formatting with recovery suggestions
  update-checker.ts     # NPM update notifications
  tools/
    search.ts           # Company search in the Handelsregister
    profiles.ts         # Company profiles, location profiles, and trade names
```

## Requirements

- Node.js >= 20
- A [KVK Developer Portal](https://developers.kvk.nl/) account with API subscription

## License

MIT - see [LICENSE](LICENSE) for details.
