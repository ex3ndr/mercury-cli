import type { Command, CommandContext } from "../types.js";
import { parseOutputFlag, printJson, printTable, formatDate } from "../../output.js";

const USAGE = \`mercury statements <account-id>
mercury statements get <account-id> <statement-id>
mercury statements --json\`;

type Statement = {
  id: string;
  period: string;
  startDate: string;
  endDate: string;
  createdAt: string;
};

type StatementsResponse = {
  statements: Statement[];
};

export const statementsCommand: Command = {
  name: "statements",
  description: "List and view account statements.",
  usage: USAGE,
  aliases: ["statement"],
  run: async (args, context) => {
    const { format, args: remaining } = parseOutputFlag(args);
    
    if (remaining.length === 0) {
      throw new Error("Missing account ID. Usage: mercury statements <account-id>");
    }

    const firstArg = remaining[0]!;

    if (firstArg === "get") {
      const accountId = remaining[1];
      const statementId = remaining[2];
      if (!accountId || !statementId) {
        throw new Error("Usage: mercury statements get <account-id> <statement-id>");
      }
      await getStatement(context, accountId, statementId, format);
      return;
    }

    // Default: list statements
    await listStatements(context, firstArg, format);
  },
};

async function listStatements(
  context: CommandContext,
  accountId: string,
  format: "table" | "json"
): Promise<void> {
  const response = await context.client.fetch<StatementsResponse>(
    \`/account/\${accountId}/statements\`
  );

  if (format === "json") {
    printJson(response.statements);
    return;
  }

  if (response.statements.length === 0) {
    console.log("No statements found for this account.");
    return;
  }

  printTable(response.statements, [
    { key: "id", header: "Statement ID", width: 36 },
    { key: "period", header: "Period", width: 15 },
    {
      key: "startDate",
      header: "Start",
      width: 12,
      format: (v) => formatDate(v as string),
    },
    {
      key: "endDate",
      header: "End",
      width: 12,
      format: (v) => formatDate(v as string),
    },
    {
      key: "createdAt",
      header: "Created",
      width: 12,
      format: (v) => formatDate(v as string),
    },
  ]);
}

async function getStatement(
  context: CommandContext,
  accountId: string,
  statementId: string,
  format: "table" | "json"
): Promise<void> {
  const statement = await context.client.fetch<Statement>(
    \`/account/\${accountId}/statement/\${statementId}\`
  );

  if (format === "json") {
    printJson(statement);
    return;
  }

  console.log("Statement Details");
  console.log("─────────────────");
  console.log(\`ID:         \${statement.id}\`);
  console.log(\`Period:     \${statement.period}\`);
  console.log(\`Start Date: \${formatDate(statement.startDate)}\`);
  console.log(\`End Date:   \${formatDate(statement.endDate)}\`);
  console.log(\`Created:    \${formatDate(statement.createdAt)}\`);
}
