import type { Command, CommandContext } from "../types.js";
import { parseOutputFlag, printJson, printTable, formatCurrency, formatDateTime, truncate } from "../../output.js";

const USAGE = \`mercury transactions <account-id>
mercury transactions <account-id> --limit 50
mercury transactions <account-id> --status pending
mercury transactions <account-id> --start 2024-01-01 --end 2024-12-31
mercury transactions get <account-id> <transaction-id>
mercury transactions send <account-id> --recipient <id> --amount <cents> --idempotency-key <key>
mercury transactions --json\`;

type Transaction = {
  id: string;
  kind: string;
  status: string;
  amount: number;
  counterpartyId?: string;
  counterpartyName?: string;
  counterpartyNickname?: string;
  description?: string;
  note?: string;
  externalMemo?: string;
  postedAt?: string;
  createdAt: string;
  estimatedDeliveryDate?: string;
};

type TransactionsResponse = {
  transactions: Transaction[];
  total: number;
};

type TransferRequest = {
  recipientId: string;
  amount: number;
  idempotencyKey: string;
  note?: string;
};

export const transactionsCommand: Command = {
  name: "transactions",
  description: "List, view, and send transactions.",
  usage: USAGE,
  aliases: ["tx", "txn"],
  run: async (args, context) => {
    const { format, args: remaining } = parseOutputFlag(args);
    
    if (remaining.length === 0) {
      throw new Error("Missing account ID. Usage: mercury transactions <account-id>");
    }

    const firstArg = remaining[0]!;

    // Check for subcommands
    if (firstArg === "get") {
      const accountId = remaining[1];
      const txId = remaining[2];
      if (!accountId || !txId) {
        throw new Error("Usage: mercury transactions get <account-id> <transaction-id>");
      }
      await getTransaction(context, accountId, txId, format);
      return;
    }

    if (firstArg === "send") {
      const accountId = remaining[1];
      if (!accountId) {
        throw new Error("Usage: mercury transactions send <account-id> --recipient <id> --amount <cents> --idempotency-key <key>");
      }
      const options = parseSendOptions(remaining.slice(2));
      await sendTransaction(context, accountId, options, format);
      return;
    }

    // Default: list transactions for account
    const accountId = firstArg;
    const options = parseListOptions(remaining.slice(1));
    await listTransactions(context, accountId, options, format);
  },
};

type ListOptions = {
  limit?: number;
  offset?: number;
  status?: string;
  start?: string;
  end?: string;
  search?: string;
};

function parseListOptions(args: readonly string[]): ListOptions {
  const options: ListOptions = {};

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === undefined) continue;

    if (arg === "--limit") {
      const value = args[++i];
      if (!value) throw new Error("--limit requires a value");
      options.limit = parseInt(value, 10);
      continue;
    }
    if (arg === "--offset") {
      const value = args[++i];
      if (!value) throw new Error("--offset requires a value");
      options.offset = parseInt(value, 10);
      continue;
    }
    if (arg === "--status") {
      const value = args[++i];
      if (!value) throw new Error("--status requires a value");
      options.status = value;
      continue;
    }
    if (arg === "--start") {
      const value = args[++i];
      if (!value) throw new Error("--start requires a value");
      options.start = value;
      continue;
    }
    if (arg === "--end") {
      const value = args[++i];
      if (!value) throw new Error("--end requires a value");
      options.end = value;
      continue;
    }
    if (arg === "--search") {
      const value = args[++i];
      if (!value) throw new Error("--search requires a value");
      options.search = value;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(\`Unknown option: \${arg}\`);
    }
  }

  return options;
}

type SendOptions = {
  recipientId: string;
  amount: number;
  idempotencyKey: string;
  note?: string;
  method?: "ach" | "wire";
};

function parseSendOptions(args: readonly string[]): SendOptions {
  let recipientId: string | undefined;
  let amount: number | undefined;
  let idempotencyKey: string | undefined;
  let note: string | undefined;
  let method: "ach" | "wire" = "ach";

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === undefined) continue;

    if (arg === "--recipient") {
      const value = args[++i];
      if (!value) throw new Error("--recipient requires a value");
      recipientId = value;
      continue;
    }
    if (arg === "--amount") {
      const value = args[++i];
      if (!value) throw new Error("--amount requires a value");
      amount = parseInt(value, 10);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("--amount must be a positive integer (cents)");
      }
      continue;
    }
    if (arg === "--idempotency-key") {
      const value = args[++i];
      if (!value) throw new Error("--idempotency-key requires a value");
      idempotencyKey = value;
      continue;
    }
    if (arg === "--note") {
      const value = args[++i];
      if (!value) throw new Error("--note requires a value");
      note = value;
      continue;
    }
    if (arg === "--method") {
      const value = args[++i];
      if (!value || (value !== "ach" && value !== "wire")) {
        throw new Error("--method must be 'ach' or 'wire'");
      }
      method = value;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(\`Unknown option: \${arg}\`);
    }
  }

  if (!recipientId) throw new Error("Missing required --recipient");
  if (!amount) throw new Error("Missing required --amount");
  if (!idempotencyKey) throw new Error("Missing required --idempotency-key");

  return { recipientId, amount, idempotencyKey, note, method };
}

async function listTransactions(
  context: CommandContext,
  accountId: string,
  options: ListOptions,
  format: "table" | "json"
): Promise<void> {
  const params = new URLSearchParams();
  if (options.limit) params.set("limit", String(options.limit));
  if (options.offset) params.set("offset", String(options.offset));
  if (options.status) params.set("status", options.status);
  if (options.start) params.set("start", options.start);
  if (options.end) params.set("end", options.end);
  if (options.search) params.set("search", options.search);

  const query = params.toString();
  const path = \`/account/\${accountId}/transactions\${query ? \`?\${query}\` : ""}\`;
  
  const response = await context.client.fetch<TransactionsResponse>(path);

  if (format === "json") {
    printJson(response);
    return;
  }

  console.log(\`Transactions (total: \${response.total})\`);
  console.log("");

  printTable(response.transactions, [
    { key: "id", header: "ID", width: 36 },
    { key: "kind", header: "Type", width: 18 },
    { key: "status", header: "Status", width: 10 },
    { 
      key: "amount", 
      header: "Amount", 
      width: 12,
      format: (v) => formatCurrency(v as number)
    },
    { 
      key: "counterpartyName", 
      header: "Counterparty", 
      width: 25,
      format: (v) => truncate(String(v ?? "-"), 25)
    },
    {
      key: "postedAt",
      header: "Posted",
      width: 18,
      format: (v) => formatDateTime(v as string | null)
    },
  ]);
}

async function getTransaction(
  context: CommandContext,
  accountId: string,
  txId: string,
  format: "table" | "json"
): Promise<void> {
  const tx = await context.client.fetch<Transaction>(
    \`/account/\${accountId}/transaction/\${txId}\`
  );

  if (format === "json") {
    printJson(tx);
    return;
  }

  console.log("Transaction Details");
  console.log("───────────────────");
  console.log(\`ID:                \${tx.id}\`);
  console.log(\`Type:              \${tx.kind}\`);
  console.log(\`Status:            \${tx.status}\`);
  console.log(\`Amount:            \${formatCurrency(tx.amount)}\`);
  console.log(\`Counterparty:      \${tx.counterpartyName ?? "-"}\`);
  console.log(\`Counterparty ID:   \${tx.counterpartyId ?? "-"}\`);
  console.log(\`Description:       \${tx.description ?? "-"}\`);
  console.log(\`Note:              \${tx.note ?? "-"}\`);
  console.log(\`External Memo:     \${tx.externalMemo ?? "-"}\`);
  console.log(\`Created:           \${formatDateTime(tx.createdAt)}\`);
  console.log(\`Posted:            \${formatDateTime(tx.postedAt)}\`);
  console.log(\`Est. Delivery:     \${formatDateTime(tx.estimatedDeliveryDate)}\`);
}

async function sendTransaction(
  context: CommandContext,
  accountId: string,
  options: SendOptions,
  format: "table" | "json"
): Promise<void> {
  const body: TransferRequest = {
    recipientId: options.recipientId,
    amount: options.amount,
    idempotencyKey: options.idempotencyKey,
  };
  if (options.note) body.note = options.note;

  const endpoint = options.method === "wire" 
    ? \`/account/\${accountId}/transactions/external-domestic-wire\`
    : \`/account/\${accountId}/transactions/external\`;

  const tx = await context.client.fetch<Transaction>(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (format === "json") {
    printJson(tx);
    return;
  }

  console.log("Transaction Created");
  console.log("───────────────────");
  console.log(\`ID:        \${tx.id}\`);
  console.log(\`Status:    \${tx.status}\`);
  console.log(\`Amount:    \${formatCurrency(tx.amount)}\`);
  console.log(\`Method:    \${options.method?.toUpperCase() ?? "ACH"}\`);
}
