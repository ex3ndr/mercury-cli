# mercury-cli

CLI for the [Mercury Banking API](https://docs.mercury.com/reference).

## Installation

```bash
# Run directly with bun
bun run sources/main.ts

# Or build native binary
bun run build
./dist/mercury
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

### Authentication
```bash
mercury login --token <TOKEN>     # Store API token
mercury login --token-stdin       # Read token from stdin
mercury logout                    # Remove stored token
mercury status                    # Show auth status
```

### Accounts
```bash
mercury accounts                  # List all accounts
mercury accounts list             # Same as above
mercury accounts get <id>         # Get account details
mercury accounts --json           # Output as JSON
```

### Transactions
```bash
mercury transactions <account-id>                     # List transactions
mercury transactions <account-id> --limit 50          # With pagination
mercury transactions <account-id> --status pending    # Filter by status
mercury transactions <account-id> --start 2024-01-01  # Date range
mercury transactions get <account-id> <tx-id>         # Get details

# Send money
mercury transactions send <account-id> \
  --recipient <recipient-id> \
  --amount <cents> \
  --idempotency-key <unique-key> \
  [--note "Payment note"] \
  [--method ach|wire]
```

### Recipients
```bash
mercury recipients                # List all recipients
mercury recipients get <id>       # Get recipient details

# Add recipient
mercury recipients add \
  --name "Acme Corp" \
  --account 123456789 \
  --routing 021000021 \
  [--email acme@example.com] \
  [--bank-name "Chase"] \
  [--account-type businessChecking]

mercury recipients delete <id>    # Delete recipient
```

### Cards
```bash
mercury cards <account-id>        # List cards for account
mercury cards <account-id> --json # Output as JSON
```

### Statements
```bash
mercury statements <account-id>              # List statements
mercury statements get <account-id> <id>     # Get statement details
```

### Webhooks
```bash
mercury webhooks                             # List webhooks
mercury webhooks get <id>                    # Get webhook details

# Create webhook
mercury webhooks create \
  --url https://example.com/webhook \
  [--events transaction.created,transaction.updated]

# Update webhook
mercury webhooks update <id> \
  [--url <new-url>] \
  [--status active|paused]

mercury webhooks delete <id>                 # Delete webhook
mercury webhooks verify <id>                 # Trigger verification
```

### Events (Audit Trail)
```bash
mercury events                    # List recent events
mercury events --limit 100        # With pagination
mercury events --type transaction # Filter by type
mercury events get <id>           # Get event details
```

## Output Formats

All commands support `--json` flag for machine-readable output:

```bash
# Human-readable table (default)
mercury accounts

# JSON output (for scripting)
mercury accounts --json | jq '.[] | .id'
```

## Authentication

Get your API token from the [Mercury Dashboard](https://app.mercury.com/settings/api).

```bash
# Store token
mercury login --token <TOKEN>

# Or pipe from stdin (for CI/CD)
echo $MERCURY_TOKEN | mercury login --token-stdin

# Check status
mercury status
```

Tokens are stored in `~/.mercury/token` with restricted permissions.

## Configuration

Optional config at `~/.mercury/config.json`:

```json
{
  "defaultAccountId": "your-default-account-id",
  "apiBaseUrl": "https://api.mercury.com/api/v1"
}
```

## License

MIT
