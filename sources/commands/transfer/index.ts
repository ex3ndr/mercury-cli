import type { Command, CommandContext } from "../types.js";
import { parseOutputFlag, printJson, formatCurrency } from "../../output.js";

const USAGE = `mercury transfer --from <account-id> --to <account-id> --amount <cents> --idempotency-key <key>
mercury transfer --json`;

type TransferResponse = {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  status: string;
  createdAt: string;
};

type TransferOptions = {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  idempotencyKey: string;
  note?: string;
};

export const transferCommand: Command = {
  name: "transfer",
  description: "Transfer money between your Mercury accounts.",
  usage: USAGE,
  run: async (args, context) => {
    const { format, args: remaining } = parseOutputFlag(args);
    const options = parseTransferOptions(remaining);

    const body = {
      fromAccountId: options.fromAccountId,
      toAccountId: options.toAccountId,
      amount: options.amount,
      idempotencyKey: options.idempotencyKey,
      ...(options.note && { note: options.note }),
    };

    const transfer = await context.client.fetch<TransferResponse>("/transfer", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (format === "json") {
      printJson(transfer);
      return;
    }

    console.log("Transfer Initiated");
    console.log("──────────────────");
    console.log(`ID:     ${transfer.id}`);
    console.log(`From:   ${transfer.fromAccountId}`);
    console.log(`To:     ${transfer.toAccountId}`);
    console.log(`Amount: ${formatCurrency(transfer.amount)}`);
    console.log(`Status: ${transfer.status}`);
  },
};

function parseTransferOptions(args: readonly string[]): TransferOptions {
  let fromAccountId: string | undefined;
  let toAccountId: string | undefined;
  let amount: number | undefined;
  let idempotencyKey: string | undefined;
  let note: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--from") {
      fromAccountId = args[++i];
      if (!fromAccountId) throw new Error("--from requires a value");
    } else if (arg === "--to") {
      toAccountId = args[++i];
      if (!toAccountId) throw new Error("--to requires a value");
    } else if (arg === "--amount") {
      const value = args[++i];
      if (!value) throw new Error("--amount requires a value");
      amount = parseInt(value, 10);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("--amount must be a positive integer (cents)");
      }
    } else if (arg === "--idempotency-key") {
      idempotencyKey = args[++i];
      if (!idempotencyKey) throw new Error("--idempotency-key requires a value");
    } else if (arg === "--note") {
      note = args[++i];
      if (!note) throw new Error("--note requires a value");
    } else if (arg?.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!fromAccountId) throw new Error("Missing required --from");
  if (!toAccountId) throw new Error("Missing required --to");
  if (!amount) throw new Error("Missing required --amount");
  if (!idempotencyKey) throw new Error("Missing required --idempotency-key");

  return { fromAccountId, toAccountId, amount, idempotencyKey, note };
}
