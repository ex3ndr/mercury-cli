import type { Command, CommandContext } from "../types.js";
import { parseOutputFlag, printJson, printTable, formatCurrency, formatDate } from "../../output.js";

const USAGE = \`mercury accounts
mercury accounts list
mercury accounts get <account-id>
mercury accounts --json\`;

type Account = {
  id: string;
  name: string;
  status: string;
  type: string;
  accountNumber: string;
  routingNumber: string;
  currentBalance: number;
  availableBalance: number;
  createdAt: string;
};

type AccountsResponse = {
  accounts: Account[];
};

export const accountsCommand: Command = {
  name: "accounts",
  description: "List and view Mercury accounts.",
  usage: USAGE,
  aliases: ["account", "acc"],
  run: async (args, context) => {
    const { format, args: remaining } = parseOutputFlag(args);
    const subcommand = remaining[0] ?? "list";

    switch (subcommand) {
      case "list":
        await listAccounts(context, format);
        return;
      case "get":
        const accountId = remaining[1];
        if (!accountId) {
          throw new Error("Missing account ID. Usage: mercury accounts get <account-id>");
        }
        await getAccount(context, accountId, format);
        return;
      default:
        throw new Error(\`Unknown subcommand: \${subcommand}. Use 'list' or 'get'.\`);
    }
  },
};

async function listAccounts(context: CommandContext, format: "table" | "json"): Promise<void> {
  const response = await context.client.fetch<AccountsResponse>("/accounts");
  const accounts = response.accounts;

  if (format === "json") {
    printJson(accounts);
    return;
  }

  printTable(accounts, [
    { key: "id", header: "ID", width: 36 },
    { key: "name", header: "Name", width: 20 },
    { key: "type", header: "Type", width: 12 },
    { key: "status", header: "Status", width: 10 },
    { 
      key: "availableBalance", 
      header: "Available", 
      width: 15,
      format: (v) => formatCurrency(v as number)
    },
    {
      key: "currentBalance",
      header: "Current",
      width: 15,
      format: (v) => formatCurrency(v as number)
    },
  ]);
}

async function getAccount(context: CommandContext, accountId: string, format: "table" | "json"): Promise<void> {
  const account = await context.client.fetch<Account>(\`/account/\${accountId}\`);

  if (format === "json") {
    printJson(account);
    return;
  }

  console.log("Account Details");
  console.log("───────────────");
  console.log(\`ID:              \${account.id}\`);
  console.log(\`Name:            \${account.name}\`);
  console.log(\`Type:            \${account.type}\`);
  console.log(\`Status:          \${account.status}\`);
  console.log(\`Account Number:  \${account.accountNumber}\`);
  console.log(\`Routing Number:  \${account.routingNumber}\`);
  console.log(\`Available:       \${formatCurrency(account.availableBalance)}\`);
  console.log(\`Current:         \${formatCurrency(account.currentBalance)}\`);
  console.log(\`Created:         \${formatDate(account.createdAt)}\`);
}
