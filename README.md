# mercury-cli

![Mercury CLI Hero](hero.png)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A powerful CLI for the [Mercury Banking API](https://docs.mercury.com/reference). Manage accounts, transactions, recipients, webhooks, and more from your terminal.

## Features

- 🏦 **Full Mercury API coverage** — accounts, transactions, transfers, recipients, webhooks, and more
- 📊 **Multiple output formats** — human-readable tables or JSON for scripting
- 🔐 **Secure token storage** — credentials stored safely in `~/.mercury/`
- ⚡ **Fast** — lightweight with minimal dependencies
- 🤖 **Scriptable** — no interactive prompts, perfect for CI/CD and automation

## Installation

```bash
npm install -g mercury-cli
```

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

---

## Global Options

All commands support these global options:

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON instead of human-readable tables |
| `-h`, `--help` | Show help for the command |
| `-v`, `--version` | Show CLI version |

---

## Authentication

Mercury CLI uses API tokens for authentication. Tokens are stored locally in `~/.mercury/token` with restricted permissions (mode `600`).

### Getting Your API Token

1. Log in to [Mercury Dashboard](https://app.mercury.com)
2. Navigate to **Settings → API**
3. Click **Create API Token**
4. Choose token permissions:
   - **Read-only**: Can fetch all data, cannot initiate transactions
   - **Read-write**: Full access including payments
   - **Custom**: Fine-grained scope control
5. Copy the token (format: `secret-token:mercury_production_...`)

### Token Scopes

| Scope | Permissions |
|-------|-------------|
| `read` | View accounts, transactions, recipients |
| `offline_access` | Refresh token access |
| `SendMoney` | Initiate transfers and payments |
| `RequestCards` | Create debit cards |

---

### `mercury login`

Store an API token for authentication.

**Syntax:**
```
mercury login --token <TOKEN>
mercury login --token-stdin
```

**Flags:**

| Flag | Required | Description |
|------|----------|-------------|
| `--token <TOKEN>` | One of these | API token string |
| `--token-stdin` | One of these | Read token from stdin |

**Examples:**

```bash
# Direct token input
mercury login --token "secret-token:mercury_production_wma_xxx"

# From environment variable
mercury login --token "$MERCURY_TOKEN"

# From stdin (CI/CD friendly)
echo "$MERCURY_TOKEN" | mercury login --token-stdin

# From file
cat ~/.secrets/mercury | mercury login --token-stdin
```

**Success Response:**
```
Authenticated successfully. Token saved to ~/.mercury/token
```

**Error Cases:**

| Error | Cause | Solution |
|-------|-------|----------|
| `Missing token` | Neither `--token` nor `--token-stdin` provided | Provide token via one of the methods |
| `Token cannot be empty` | Empty string provided | Ensure token is not empty |
| `Use either --token or --token-stdin, not both` | Both flags used | Use only one method |

---

### `mercury logout`

Remove stored authentication token.

**Syntax:**
```
mercury logout
```

**Examples:**

```bash
mercury logout
# Output: Logged out. Token removed from ~/.mercury/token

# If not logged in:
mercury logout
# Output: Not currently authenticated.
```

---

### `mercury status`

Show current authentication and configuration status.

**Syntax:**
```
mercury status
```

**Example Output:**
```
Mercury CLI Status
──────────────────
Authenticated: Yes
Token: secret-tok...xxxx
API Base URL: https://api.mercury.com/api/v1
Default Account: abc123-def456-...
```

**Fields:**

| Field | Description |
|-------|-------------|
| `Authenticated` | Yes/No |
| `Token` | Masked token (first 10 + last 4 chars) |
| `API Base URL` | API endpoint being used |
| `Default Account` | If configured in config.json |

---

## Token Storage & Configuration

### File Locations

| File | Purpose | Permissions |
|------|---------|-------------|
| `~/.mercury/token` | API token | `600` (owner read/write only) |
| `~/.mercury/config.json` | Optional configuration | `600` |

### Configuration File

Optional configuration at `~/.mercury/config.json`:

```json
{
  "defaultAccountId": "abc123-def456-...",
  "apiBaseUrl": "https://api.mercury.com/api/v1"
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `defaultAccountId` | string | none | Account ID to use when not specified |
| `apiBaseUrl` | string | `https://api.mercury.com/api/v1` | API endpoint |

### Security Best Practices

1. **Never commit tokens** — Add `.mercury/` to `.gitignore`
2. **Use environment variables in CI** — Don't hardcode tokens
3. **Rotate tokens periodically** — Regenerate from Mercury Dashboard
4. **Use read-only tokens when possible** — Minimize risk

---

## Accounts

Manage Mercury bank accounts.

**Aliases:** `account`, `acc`

### `mercury accounts` / `mercury accounts list`

List all accounts.

**Syntax:**
```
mercury accounts [list] [--json]
```

**Example Output:**
```
ID                                    Name                  Type          Status      Available        Current
──────────────────────────────────    ────────────────────  ────────────  ──────────  ───────────────  ───────────────
abc123-def456-...                     Operating Account     checking      active      $125,432.10      $125,432.10
xyz789-uvw012-...                     Savings               savings       active      $50,000.00       $50,000.00
```

**JSON Response:**
```json
[
  {
    "id": "abc123-def456-...",
    "name": "Operating Account",
    "status": "active",
    "type": "checking",
    "accountNumber": "1234567890",
    "routingNumber": "021000021",
    "currentBalance": 12543210,
    "availableBalance": 12543210,
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

### `mercury accounts get`

Get detailed information about a specific account.

**Syntax:**
```
mercury accounts get <account-id> [--json]
```

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `account-id` | Yes | The UUID of the account |

**Example:**
```bash
mercury accounts get abc123-def456-789a-bcde-f01234567890
```

**Output:**
```
Account Details
───────────────
ID:              abc123-def456-789a-bcde-f01234567890
Name:            Operating Account
Type:            checking
Status:          active
Account Number:  1234567890
Routing Number:  021000021
Available:       $125,432.10
Current:         $125,432.10
Created:         Jan 15, 2024
```

**Account Types:**
- `checking` — Standard business checking account
- `savings` — Business savings account
- `mercury_treasury` — Mercury Treasury account

**Account Statuses:**
- `active` — Account is open and operational
- `pending` — Account is being set up
- `closed` — Account has been closed

---

## Transactions

View and send transactions.

**Aliases:** `tx`, `txn`

### `mercury transactions`

List transactions for an account.

**Syntax:**
```
mercury transactions <account-id> [options] [--json]
```

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `account-id` | Yes | The UUID of the account |

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--limit <N>` | integer | 25 | Maximum number of transactions to return |
| `--offset <N>` | integer | 0 | Number of transactions to skip (for pagination) |
| `--status <status>` | string | all | Filter by status: `pending`, `sent`, `cancelled`, `failed` |
| `--start <date>` | ISO date | none | Filter transactions on or after this date |
| `--end <date>` | ISO date | none | Filter transactions on or before this date |
| `--search <query>` | string | none | Search by counterparty name |

**Examples:**

```bash
# List recent transactions
mercury transactions abc123-def456-...

# With pagination
mercury transactions abc123-def456-... --limit 50 --offset 100

# Filter by status
mercury transactions abc123-def456-... --status pending

# Filter by date range
mercury transactions abc123-def456-... --start 2024-01-01 --end 2024-12-31

# Search by counterparty
mercury transactions abc123-def456-... --search "Acme Corp"
```

**Transaction Statuses:**
- `pending` — Transaction is being processed
- `sent` — Transaction completed successfully
- `cancelled` — Transaction was cancelled
- `failed` — Transaction failed

**Transaction Kinds:**
- `externalTransfer` — ACH or wire transfer to external account
- `internalTransfer` — Transfer between Mercury accounts
- `outgoingPayment` — Check or other outgoing payment
- `incomingPayment` — Received payment

---

### `mercury transactions get`

Get detailed information about a specific transaction.

**Syntax:**
```
mercury transactions get <account-id> <transaction-id> [--json]
```

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `account-id` | Yes | The UUID of the account |
| `transaction-id` | Yes | The UUID of the transaction |

---

### `mercury transactions send`

Send money to a recipient via ACH or wire transfer.

**Syntax:**
```
mercury transactions send <account-id> --recipient <id> --amount <cents> --idempotency-key <key> [options] [--json]
```

**Options:**

| Option | Required | Type | Description |
|--------|----------|------|-------------|
| `--recipient <id>` | Yes | string | Recipient UUID |
| `--amount <cents>` | Yes | integer | Amount in cents (e.g., `10000` = $100.00) |
| `--idempotency-key <key>` | Yes | string | Unique key to prevent duplicate transactions |
| `--method <method>` | No | string | Transfer method: `ach` (default) or `wire` |
| `--note <note>` | No | string | Internal note for the transaction |

**Examples:**

```bash
# Send $100 via ACH
mercury transactions send abc123-def456-... \
  --recipient recip-123 \
  --amount 10000 \
  --idempotency-key "invoice-2024-001"

# Send $500 via Wire with note
mercury transactions send abc123-def456-... \
  --recipient recip-123 \
  --amount 50000 \
  --idempotency-key "wire-2024-001" \
  --method wire \
  --note "Urgent payment"
```

**Important Notes:**
- Amounts are always in cents (smallest currency unit)
- Idempotency keys prevent duplicate transactions if the request is retried
- Wire transfers typically have higher fees but faster delivery
- ACH transfers take 1-3 business days

---

## Internal Transfers

### `mercury transfer`

Transfer funds between two Mercury accounts you own.

**Syntax:**
```
mercury transfer --from <account-id> --to <account-id> --amount <cents> --idempotency-key <key> [options] [--json]
```

**Options:**

| Option | Required | Type | Description |
|--------|----------|------|-------------|
| `--from <id>` | Yes | string | Source account UUID |
| `--to <id>` | Yes | string | Destination account UUID |
| `--amount <cents>` | Yes | integer | Amount in cents |
| `--idempotency-key <key>` | Yes | string | Unique key to prevent duplicates |
| `--note <note>` | No | string | Internal note |

---

## Recipients

Manage payment recipients (external bank accounts).

**Aliases:** `recipient`, `recip`

### `mercury recipients` / `mercury recipients list`

List all recipients.

**Syntax:**
```
mercury recipients [list] [--limit <N>] [--offset <N>] [--json]
```

### `mercury recipients get`

Get detailed information about a recipient.

**Syntax:**
```
mercury recipients get <recipient-id> [--json]
```

### `mercury recipients add`

Add a new payment recipient.

**Syntax:**
```
mercury recipients add --name <name> --account <number> --routing <number> [options] [--json]
```

**Options:**

| Option | Required | Type | Description |
|--------|----------|------|-------------|
| `--name <name>` | Yes | string | Recipient name |
| `--account <number>` | Yes | string | Bank account number |
| `--routing <number>` | Yes | string | Bank routing number (9 digits) |
| `--bank-name <name>` | No | string | Name of the bank |
| `--account-type <type>` | No | string | Account type |
| `--email <email>` | No | string | Contact email (repeatable) |

**Account Types:** `businessChecking`, `businessSavings`, `personalChecking`, `personalSavings`

### `mercury recipients delete`

Delete a recipient.

**Syntax:**
```
mercury recipients delete <recipient-id>
```

---

## Cards

**Aliases:** `card`

### `mercury cards`

List cards for an account.

**Syntax:**
```
mercury cards <account-id> [--json]
```

**Card Statuses:** `active`, `frozen`, `cancelled`

---

## Statements

**Aliases:** `statement`

### `mercury statements`

List statements for an account.

**Syntax:**
```
mercury statements <account-id> [--json]
```

### `mercury statements get`

Get a specific statement.

**Syntax:**
```
mercury statements get <account-id> <statement-id> [--json]
```

---

## Webhooks

**Aliases:** `webhook`, `wh`

### `mercury webhooks` / `mercury webhooks list`

List all webhook endpoints.

**Syntax:**
```
mercury webhooks [list] [--json]
```

### `mercury webhooks get`

Get details about a webhook.

**Syntax:**
```
mercury webhooks get <webhook-id> [--json]
```

### `mercury webhooks create`

Create a new webhook endpoint.

**Syntax:**
```
mercury webhooks create --url <url> [--events <event1,event2>] [--secret <secret>] [--json]
```

**Event Types:** `transaction.created`, `transaction.updated`, `account.created`, `recipient.created`, `*` (wildcard)

### `mercury webhooks update`

Update an existing webhook.

**Syntax:**
```
mercury webhooks update <webhook-id> [--url <url>] [--events <events>] [--status <status>] [--json]
```

### `mercury webhooks delete`

Delete a webhook endpoint.

**Syntax:**
```
mercury webhooks delete <webhook-id>
```

### `mercury webhooks verify`

Send a test event to verify webhook connectivity.

**Syntax:**
```
mercury webhooks verify <webhook-id>
```

---

## Events

**Aliases:** `event`

### `mercury events` / `mercury events list`

List API events (audit trail).

**Syntax:**
```
mercury events [list] [--limit <N>] [--offset <N>] [--type <type>] [--json]
```

### `mercury events get`

Get details about a specific event.

**Syntax:**
```
mercury events get <event-id> [--json]
```

---

## Organization

**Aliases:** `org`

### `mercury organization`

Get organization information (legal name, EIN, address).

**Syntax:**
```
mercury organization [--json]
```

---

## Users

**Aliases:** `user`

### `mercury users` / `mercury users list`

List all users in the organization.

**Syntax:**
```
mercury users [list] [--json]
```

### `mercury users get`

Get details about a specific user.

**Syntax:**
```
mercury users get <user-id> [--json]
```

---

## Categories

**Aliases:** `category`, `cat`

### `mercury categories`

List available transaction categories.

**Syntax:**
```
mercury categories [--json]
```

---

## Error Handling

### Common Errors

| HTTP Code | Error | Cause | Solution |
|-----------|-------|-------|----------|
| 401 | `Not authenticated` | Missing or invalid token | Run `mercury login` |
| 403 | `Forbidden` | Token lacks required scope | Get token with appropriate permissions |
| 404 | `Not found` | Resource doesn't exist | Verify the ID |
| 422 | `Validation error` | Invalid parameters | Check format and values |
| 429 | `Rate limited` | Too many requests | Wait and retry |

---

## Scripting Examples

### Export Transactions to CSV

```bash
mercury transactions "$ACCOUNT_ID" --limit 1000 --json | \
  jq -r '.transactions[] | [.id, .status, .amount, .counterpartyName] | @csv'
```

### Daily Balance Check

```bash
balance=$(mercury accounts get "$ACCOUNT_ID" --json | jq -r '.availableBalance')
echo "Balance: $((balance / 100)) dollars"
```

---

## API Reference

- **Base URL:** `https://api.mercury.com/api/v1`
- **Authentication:** Bearer token
- **Rate Limits:** 100 requests per minute
- **Documentation:** [docs.mercury.com/reference](https://docs.mercury.com/reference)

### Endpoint Mapping

| CLI Command | HTTP Method | API Endpoint |
|-------------|-------------|--------------|
| `accounts list` | GET | `/accounts` |
| `accounts get <id>` | GET | `/account/{id}` |
| `transactions list` | GET | `/account/{id}/transactions` |
| `transactions send` | POST | `/account/{id}/transactions` |
| `transfer` | POST | `/transfer` |
| `recipients list` | GET | `/recipients` |
| `recipients add` | POST | `/recipients` |
| `recipients delete <id>` | DELETE | `/recipient/{id}` |
| `cards` | GET | `/account/{id}/cards` |
| `statements list` | GET | `/account/{id}/statements` |
| `webhooks list` | GET | `/webhooks` |
| `webhooks create` | POST | `/webhooks` |
| `events list` | GET | `/events` |
| `organization` | GET | `/organization` |
| `users list` | GET | `/users` |
| `categories` | GET | `/categories` |

---

## License

MIT License. See [LICENSE](LICENSE) for details.