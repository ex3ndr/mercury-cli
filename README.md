# mercury-cli

CLI for the [Mercury Banking API](https://docs.mercury.com/reference).

## Installation

```bash
# From npm (when published)
npm install -g mercury-cli

# Or run directly with bun
bun run sources/main.ts
```

## Quick Start

```bash
# Authenticate with your Mercury API token
mercury login --token <YOUR_API_TOKEN>

# List all accounts
mercury accounts

# List transactions for an account
mercury transactions <account-id>

# Send money (ACH)
mercury transactions send <account-id> \
  --recipient <recipient-id> \
  --amount 10000 \
  --idempotency-key unique-key-123
```

## Commands

| Command | Description |
|---------|-------------|
| `mercury login` | Authenticate with your API token |
| `mercury logout` | Remove stored credentials |
| `mercury status` | Show authentication status |
| `mercury accounts` | List and view accounts |
| `mercury transactions` | List, view, and send transactions |
| `mercury version` | Show CLI version |

### Coming Soon

- `mercury recipients` - Manage payment recipients
- `mercury cards` - View credit cards
- `mercury statements` - View account statements
- `mercury webhooks` - Manage webhooks
- `mercury events` - View API events

## Output Formats

All commands support `--json` flag for machine-readable output:

```bash
# Human-readable table (default)
mercury accounts

# JSON output
mercury accounts --json
```

## Authentication

Get your API token from the [Mercury Dashboard](https://app.mercury.com/settings/api).

```bash
# Store token
mercury login --token <TOKEN>

# Or pipe from stdin
echo $MERCURY_TOKEN | mercury login --token-stdin
```

Tokens are stored in `~/.mercury/token`.

## License

MIT
