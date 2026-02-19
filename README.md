# mercury-cli

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A powerful CLI for the [Mercury Banking API](https://docs.mercury.com/reference). Manage accounts, transactions, recipients, webhooks, and more from your terminal.

## Features

- 🏦 **Full Mercury API coverage** — accounts, transactions, transfers, recipients, webhooks, and more
- 📊 **Multiple output formats** — human-readable tables or JSON for scripting
- 🔐 **Secure token storage** — credentials stored safely in `~/.mercury/`
- ⚡ **Fast** — built with Bun for native performance
- 🤖 **Scriptable** — no interactive prompts, perfect for CI/CD and automation

## Installation

### From source (recommended)

```bash
# Clone the repository
git clone https://github.com/ex3ndr-bot/mercury-cli.git
cd mercury-cli

# Install dependencies
bun install

# Run directly
bun run sources/main.ts --help

# Or build native binary
bun run build
./dist/mercury --help
```

### Requirements

- [Bun](https://bun.sh/) v1.0 or later

## Quick Start

```bash
# 1. Get your API token from Mercury Dashboard
#    https://app.mercury.com/settings/api

# 2. Authenticate
mercury login --token <YOUR_API_TOKEN>

# 3. List your accounts
mercury accounts

# 4. View transactions
mercury transactions <account-id>
```

## Commands

### Authentication

```bash
# Login with token
mercury login --token secret-token:mercury_production_xxx

# Login from stdin (useful for CI)
echo $MERCURY_TOKEN | mercury login --token-stdin

# Check authentication status
mercury status

# Logout (remove stored token)
mercury logout
```

### Accounts

```bash
# List all accounts
mercury accounts
# Output:
# ID                                    Name                  Type          Status      Available        Current
# ──────────────────────────────────    ────────────────────  ────────────  ──────────  ───────────────  ───────────────
# abc123-def456-...                     Operating Account     checking      active      $125,432.10      $125,432.10
# xyz789-uvw012-...                     Savings               savings       active      $50,000.00       $50,000.00

# Get account details
mercury accounts get abc123-def456-...

# JSON output
mercury accounts --json
```

### Transactions

```bash
# List transactions for an account
mercury transactions abc123-def456-...

# With pagination
mercury transactions abc123-def456-... --limit 50 --offset 100

# Filter by status
mercury transactions abc123-def456-... --status pending

# Filter by date range
mercury transactions abc123-def456-... --start 2024-01-01 --end 2024-12-31

# Search by counterparty
mercury transactions abc123-def456-... --search "Acme Corp"

# Get transaction details
mercury transactions get abc123-def456-... txn789-...

# Send money (ACH)
mercury transactions send abc123-def456-... \
  --recipient recip-123 \
  --amount 10000 \
  --idempotency-key "invoice-2024-001" \
  --note "Payment for services"

# Send money (Wire)
mercury transactions send abc123-def456-... \
  --recipient recip-123 \
  --amount 50000 \
  --idempotency-key "wire-2024-001" \
  --method wire
```

### Internal Transfers

```bash
# Transfer between your Mercury accounts
mercury transfer \
  --from abc123-def456-... \
  --to xyz789-uvw012-... \
  --amount 25000 \
  --idempotency-key "transfer-2024-001"
```

### Recipients

```bash
# List all recipients
mercury recipients

# Get recipient details
mercury recipients get recip-123

# Add a new recipient
mercury recipients add \
  --name "Acme Corporation" \
  --account 123456789 \
  --routing 021000021 \
  --bank-name "Chase" \
  --account-type businessChecking \
  --email billing@acme.com

# Delete recipient
mercury recipients delete recip-123
```

### Cards

```bash
# List cards for an account
mercury cards abc123-def456-...
```

### Statements

```bash
# List statements
mercury statements abc123-def456-...

# Get statement details
mercury statements get abc123-def456-... stmt-123
```

### Webhooks

```bash
# List webhooks
mercury webhooks

# Create webhook
mercury webhooks create \
  --url https://api.example.com/mercury-webhook \
  --events transaction.created,transaction.updated

# Get webhook details
mercury webhooks get webhook-123

# Update webhook
mercury webhooks update webhook-123 --status paused

# Verify webhook endpoint
mercury webhooks verify webhook-123

# Delete webhook
mercury webhooks delete webhook-123
```

### Events (Audit Trail)

```bash
# List recent events
mercury events

# Filter by resource type
mercury events --type transaction

# With pagination
mercury events --limit 100

# Get event details
mercury events get event-123
```

### Organization

```bash
# Get organization details
mercury organization
# Output:
# Organization Details
# ────────────────────
# ID:          org-123
# Legal Name:  Acme Corporation Inc.
# EIN:         12-3456789
# DBAs:        Acme, Acme Corp
```

### Users

```bash
# List organization users
mercury users

# Get user details
mercury users get user-123
```

### Categories

```bash
# List transaction categories
mercury categories
```

## Output Formats

All commands support the `--json` flag for machine-readable output:

```bash
# Human-readable (default)
mercury accounts

# JSON output
mercury accounts --json

# Use with jq for scripting
mercury accounts --json | jq '.[0].availableBalance'

# Export to file
mercury transactions abc123... --json > transactions.json
```

## Configuration

### Token Storage

Your API token is stored securely in `~/.mercury/token` with restricted permissions (600).

### Optional Config File

Create `~/.mercury/config.json` for additional settings:

```json
{
  "defaultAccountId": "abc123-def456-...",
  "apiBaseUrl": "https://api.mercury.com/api/v1"
}
```

## Scripting Examples

### Daily Balance Report

```bash
#!/bin/bash
mercury accounts --json | jq -r '.[] | "\(.name): \(.availableBalance)"'
```

### Export Recent Transactions

```bash
#!/bin/bash
ACCOUNT_ID="abc123-def456-..."
mercury transactions $ACCOUNT_ID --limit 100 --json > ~/backups/transactions-$(date +%Y%m%d).json
```

### Webhook Setup

```bash
#!/bin/bash
mercury webhooks create \
  --url "$WEBHOOK_URL" \
  --events "transaction.created,transaction.updated"
```

### CI/CD Token Setup

```bash
# In your CI pipeline
echo "$MERCURY_API_TOKEN" | mercury login --token-stdin
mercury accounts --json  # Verify authentication
```

## Error Handling

The CLI returns appropriate exit codes:

- `0` — Success
- `1` — Error (authentication failed, API error, invalid arguments)

Error messages are written to stderr:

```bash
mercury accounts 2>/dev/null || echo "Failed to fetch accounts"
```

## API Coverage

| Resource | Commands |
|----------|----------|
| Accounts | list, get |
| Transactions | list, get, send |
| Transfers | create (internal) |
| Recipients | list, get, add, delete |
| Cards | list |
| Statements | list, get |
| Webhooks | list, get, create, update, delete, verify |
| Events | list, get |
| Organization | get |
| Users | list, get |
| Categories | list |

## Development

```bash
# Clone
git clone https://github.com/ex3ndr-bot/mercury-cli.git
cd mercury-cli

# Install dependencies
bun install

# Run in development
bun run dev

# Type check
bun run typecheck

# Build binary
bun run build
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT — see [LICENSE](LICENSE) for details.

## Disclaimer

This is an unofficial CLI client. Mercury is a trademark of Mercury Technologies, Inc.
