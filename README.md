# kvk-mcp

[![npm version](https://img.shields.io/npm/v/kvk-mcp.svg)](https://www.npmjs.com/package/kvk-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-compatible-purple.svg)](https://modelcontextprotocol.io)
[![CI](https://github.com/bartwaardenburg/kvk-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/bartwaardenburg/kvk-mcp/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/BartWaardenburg/94cbbeb22ca67c47c0b8822624f77750/raw/kvk-mcp-coverage.json)](https://bartwaardenburg.github.io/kvk-mcp/)

A community-built [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for the [KVK API](https://developers.kvk.nl/) (Kamer van Koophandel / Dutch Chamber of Commerce). Search the Handelsregister, retrieve company profiles, location details, and trade names — all through natural language via any MCP-compatible AI client.

> **Note:** This is an unofficial, community-maintained project and is not affiliated with or endorsed by KVK.

## Quick Start (Non-Developers)

You do not need to clone this repo.

1. Make sure Node.js 20+ is installed (your AI app will run `npx` on your machine)
2. Get a KVK API key (see [API Key Setup](#api-key-setup))
3. Add the server to your AI app as an MCP server (copy/paste config below)
4. Ask questions in plain language (see [Example Usage](#example-usage))

### Add To Claude Desktop (Also Works In Cowork)

Cowork runs inside Claude Desktop and uses the same connected MCP servers and permissions.

1. Open your Claude Desktop MCP config file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\\Claude\\claude_desktop_config.json`
2. Add this server entry (or merge it into your existing `mcpServers`):

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

3. Restart Claude Desktop

### Add To Other AI Apps

Most MCP apps have a screen like “Add MCP Server” where you can fill in:

- Command: `npx`
- Args: `-y kvk-mcp`
- Env: `KVK_API_KEY=your-api-key`

If your app wants JSON, paste this and adapt the top-level key name to your client (common ones are `mcpServers`, `servers`, or `context_servers`):

```json
{
  "<servers-key>": {
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

### Troubleshooting

- Error: `Missing required env var: KVK_API_KEY`
  - Fix: add `KVK_API_KEY` to the MCP server config and restart your app.
- Error: `npx: command not found` or server fails to start
  - Fix: install Node.js 20+ and restart your app.
- You can connect, but results are empty or you see `401/403`
  - Fix: verify your KVK API subscriptions match the tools you are using (see [API Subscriptions Per Tool](#api-subscriptions-per-tool)).

## Features

- **10 tools** across 3 categories covering the KVK Handelsregister and Mutatieservice APIs
- **Company search** — find businesses by name, KVK number, RSIN, address, postal code, city, or entity type
- **Basic company profiles** — registration date, legal form, trade names, SBI activity codes, employee count
- **Company owner** — RSIN, legal form (rechtsvorm), addresses, and websites of the company owner
- **Main location** — address, trade name, websites, SBI activities, and employees of the hoofdvestiging
- **All locations** — list all commercial and non-commercial vestigingen for a company
- **Location profiles** — branch addresses, business activities, contact details, commercial indicators
- **Trade name lookups** — statutory names, alternate trade names, and non-commercial designations
- **Mutation subscriptions** — list active Mutatieservice subscriptions
- **Mutation signals** — browse and inspect change signals for monitored companies
- **Input validation** via Zod schemas on every tool for safe, predictable operations
- **Response caching** with configurable TTL (300s for search, 600s for profiles — register data changes infrequently)
- **Rate limit handling** with exponential backoff and `Retry-After` header support
- **Toolset filtering** to expose only the tool categories you need
- **Docker support** for containerized deployments via GHCR
- **Actionable error messages** with context-aware recovery suggestions

## Supported Clients

<details>
<summary><strong>Advanced setup and supported clients (expand)</strong></summary>

This MCP server is not tied to one coding agent. It works with any MCP-compatible client or agent runtime that can start a stdio MCP server.

| Client / runtime | Docs |
|---|---|
| Claude Code | [MCP in Claude Code](https://docs.anthropic.com/en/docs/claude-code/mcp) |
| Anthropic API (Messages API) | [Remote MCP servers](https://docs.anthropic.com/en/docs/agents-and-tools/remote-mcp-servers) |
| Codex CLI (OpenAI) | [Codex CLI docs](https://developers.openai.com/codex/cli) |
| Gemini CLI (Google) | [Gemini CLI MCP server docs](https://google-gemini.github.io/gemini-cli/docs/tools/mcp-server.html) |
| VS Code (Copilot) | [Use MCP servers in VS Code](https://code.visualstudio.com/docs/copilot/customization/mcp-servers) |
| Claude Desktop | [MCP in Claude Desktop](https://docs.anthropic.com/en/docs/claude-desktop/mcp) |
| Cursor | [Cursor docs](https://cursor.com/docs) |
| Windsurf | [Windsurf MCP docs](https://docs.windsurf.com/windsurf/cascade/mcp) |
| Cline | [Cline MCP docs](https://docs.cline.bot/mcp/) |
| Zed | [Zed context servers docs](https://zed.dev/docs/assistant/context-servers) |
| Any other MCP host | Use command/args/env from [Generic MCP Server Config](#generic-mcp-server-config) |

### Claude Ecosystem Notes

Claude currently has multiple MCP-related concepts that are easy to mix up:

- **Local MCP servers (Claude Desktop):** defined in `claude_desktop_config.json` and started on your machine ([docs](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop)).
- **Cowork:** reuses the MCP servers connected in Claude Desktop ([docs](https://support.claude.com/en/articles/13345190-get-started-with-cowork)).
- **Connectors:** remote MCP integrations managed in Claude ([docs](https://support.claude.com/en/articles/11176164-use-connectors-to-extend-claude-s-capabilities)).
- **Cowork plugins:** Claude-specific workflow packaging (instructions + tools/data integrations) ([docs](https://support.claude.com/en/articles/13837440-use-plugins-in-cowork)). Useful in Claude, but not portable as a generic MCP server config for other agent clients.

Verified against vendor docs on **2026-03-05**.

## Setup (Power Users)

If Quick Start worked in your client, you can skip this section. These are additional per-client setup options and CLI one-liners.

### Generic MCP Server Config

Use this in any MCP host that supports stdio servers:

- **Command:** `npx`
- **Args:** `["-y", "kvk-mcp"]`
- **Required env vars:** `KVK_API_KEY`
- **Optional env vars:** `KVK_CACHE_TTL`, `KVK_MAX_RETRIES`, `KVK_TOOLSETS` (see [Configuration](#configuration))

Minimal JSON (adapt the top-level key to your host):

```json
{
  "<servers-key>": {
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

Host key mapping:

| Host | Top-level key | Notes |
|---|---|---|
| VS Code | `servers` | Add `"type": "stdio"` on the server object |
| Claude Desktop / Cursor / Windsurf / Cline | `mcpServers` | Same command/args/env block |
| Zed | `context_servers` | Same command/args/env block |
| Codex CLI (TOML) | `mcp_servers` | Uses TOML, shown below |

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

Set `KVK_API_KEY` in `~/.gemini/settings.json`.

### VS Code (Copilot)

Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) > `MCP: Add Server` > **Command (stdio)**, or use `.vscode/mcp.json` with top-level key `servers` and the canonical command/args/env block from [Generic MCP Server Config](#generic-mcp-server-config).

### Claude Desktop + Cowork / Cursor / Windsurf / Cline / Zed

Cowork runs inside Claude Desktop and uses the same connected MCP servers and permissions. Configure once in Claude Desktop, then the server is available in Cowork.

Use the canonical config block and place it in the host file below with the matching top-level key.

| Client | Config location | Top-level key |
|---|---|---|
| Claude Desktop (macOS) | `~/Library/Application Support/Claude/claude_desktop_config.json` | `mcpServers` |
| Claude Desktop (Windows) | `%APPDATA%\\Claude\\claude_desktop_config.json` | `mcpServers` |
| Cursor (project) | `.cursor/mcp.json` | `mcpServers` |
| Cursor (global) | `~/.cursor/mcp.json` | `mcpServers` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` | `mcpServers` |
| Cline | MCP settings UI | `mcpServers` |
| Zed (macOS/Linux) | `~/.zed/settings.json` or `~/.config/zed/settings.json` | `context_servers` |

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

Use the values from [Generic MCP Server Config](#generic-mcp-server-config).

## Terminology

What is portable across hosts:

- MCP server runtime settings (`command`, `args`, `env`)
- Transport model (`stdio` command server)
- Tool names and tool schemas exposed by this server

What is host/vendor-specific (not portable as-is):

- Host config key names (`servers`, `mcpServers`, `context_servers`, `mcp_servers`)
- Host UX/workflows for adding servers (CLI commands, UI menus, settings paths)
- Anthropic-specific concepts such as [Claude Desktop local MCP servers](https://docs.anthropic.com/en/docs/claude-desktop/mcp), [Claude Connectors via remote MCP](https://docs.anthropic.com/en/docs/agents-and-tools/remote-mcp-servers), and [Claude Code plugins](https://docs.anthropic.com/en/docs/claude-code/plugins) used in Cowork workflows

## Security Notes

- **Trust model:** Any prompt or agent allowed to call this MCP server can execute KVK API actions with the configured credentials.
- **Least-privilege credentials:** Use separate KVK API keys per environment/team/use case and only required API subscriptions.
- **Write-action approvals:** Enable host-side approvals for mutating tools (`create_subscription` and related mutation workflows).
- **Team config governance:** Keep shared MCP config in version control, require review for changes to command/args/env/toolset filtering, and keep secrets in a vault or host secret manager (not in plain-text repo files).

</details>

## Configuration

### Required

| Variable | Description |
|---|---|
| `KVK_API_KEY` | Your KVK API key |

Get your API key from the [KVK Developer Portal](https://developers.kvk.nl/). You need to register and subscribe to the APIs you want to use.

### Optional

| Variable | Description | Default |
|---|---|---|
| `KVK_CACHE_TTL` | Enables caching (set to `0` to disable). Tool responses use fixed TTLs (search: 300s, profiles: 600s). | unset |
| `KVK_MAX_RETRIES` | Maximum retry attempts for rate-limited (429) requests with exponential backoff. | `3` |
| `KVK_TOOLSETS` | Comma-separated list of tool categories to enable (see [Toolset Filtering](#toolset-filtering)). | All toolsets |

## API Key Setup

### Creating Your API Key

1. Register at the [KVK Developer Portal](https://developers.kvk.nl/)
2. Navigate to **API's aanvragen** (Request APIs)
3. Subscribe to the APIs you need:
   - **Zoeken API** (Search) — required for `search_companies`
   - **Basisprofiel API** — required for `get_company_profile`, `get_company_owner`, `get_main_location`, `get_company_locations`
   - **Vestigingsprofiel API** — required for `get_location_profile`
   - **Naamgeving API** — required for `get_trade_names`
   - **Mutatieservice API** — required for `list_subscriptions`, `list_signals`, `get_signal`
4. Your API key will be generated after approval

### API Subscriptions Per Tool

| API Subscription | Tools |
|---|---|
| **Zoeken** (Search) | `search_companies` |
| **Basisprofiel** (Basic Profile) | `get_company_profile`, `get_company_owner`, `get_main_location`, `get_company_locations` |
| **Vestigingsprofiel** (Location Profile) | `get_location_profile` |
| **Naamgeving** (Trade Names) | `get_trade_names` |
| **Mutatieservice** (Mutation Service) | `list_subscriptions`, `list_signals`, `get_signal` |

## Available Tools

### Search

| Tool | Description |
|---|---|
| `search_companies` | Search the KVK business register by company name, KVK number, RSIN, street, house number, postal code, city, or entity type. Returns up to 100 results per page. |

### Profiles

| Tool | Description |
|---|---|
| `get_company_profile` | Get the basic company profile (basisprofiel) by KVK number — includes statutory name, trade names, registration dates, SBI activity codes, employee count, legal form, and main branch details |
| `get_company_owner` | Get the owner (eigenaar) of a company by KVK number — includes RSIN, legal form (rechtsvorm), addresses, and websites |
| `get_main_location` | Get the main location (hoofdvestiging) for a company by KVK number — includes address, trade name, websites, SBI activities, and employees |
| `get_company_locations` | List all locations (vestigingen) for a company by KVK number — includes counts and details of commercial and non-commercial locations |
| `get_location_profile` | Get a location profile (vestigingsprofiel) by vestigingsnummer — includes full address, business activities, employee breakdown, website, and commercial indicators |
| `get_trade_names` | Get all trade names (handelsnamen) for a KVK number — includes statutory name, commercial and non-commercial designations per branch |

### Mutations

| Tool | Description |
|---|---|
| `list_subscriptions` | List all mutation subscriptions (abonnementen) for the KVK Mutatieservice — returns active subscriptions with IDs and descriptions |
| `list_signals` | List mutation signals (signalen) for a specific subscription — returns a paged list of change signals with filtering by date range |
| `get_signal` | Get the full details of a specific mutation signal by subscription ID and signal ID |

## Toolset Filtering

Reduce context window usage by enabling only the tool categories you need. Set the `KVK_TOOLSETS` environment variable to a comma-separated list:

```bash
KVK_TOOLSETS=search
```

| Toolset | Tools included |
|---|---|
| `search` | Company search in the Handelsregister |
| `profiles` | Basic profiles, owner, main location, all locations, location profiles, and trade names |
| `mutations` | Mutation subscriptions, signals, and signal details (Mutatieservice) |

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
- "Who is the owner of KVK 12345678?"
- "What is the main location for this company?"
- "List all locations for KVK 12345678"
- "Show my mutation subscriptions"
- "What changes have been signalled for this subscription?"

## Community

- Support: [SUPPORT.md](SUPPORT.md)
- Security reporting: [SECURITY.md](SECURITY.md)
- Contributing guidelines: [CONTRIBUTING.md](CONTRIBUTING.md)
- Bug reports and feature requests: [Issues](https://github.com/bartwaardenburg/kvk-mcp/issues)

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
    profiles.ts         # Company profiles, owner, locations, and trade names
    mutations.ts        # Mutation subscriptions and signals (Mutatieservice)
```

## Requirements

- Node.js >= 20
- A [KVK Developer Portal](https://developers.kvk.nl/) account with API subscription

## License

MIT - see [LICENSE](LICENSE) for details.
