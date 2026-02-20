import type { Command, CommandContext } from "../types.js";
import { parseOutputFlag, printJson, printTable } from "../../output.js";

const USAGE = `mercury users
mercury users list
mercury users get <user-id>
mercury users --json`;

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
  status?: string;
};

type UsersResponse = {
  users: User[];
};

export const usersCommand: Command = {
  name: "users",
  description: "List and view organization users.",
  usage: USAGE,
  aliases: ["user"],
  run: async (args, context) => {
    const { format, args: remaining } = parseOutputFlag(args);
    const subcommand = remaining[0] ?? "list";

    switch (subcommand) {
      case "list":
        await listUsers(context, format);
        return;
      case "get":
        const userId = remaining[1];
        if (!userId) throw new Error("Missing user ID");
        await getUser(context, userId, format);
        return;
      default:
        // Could be a user ID directly
        if (!subcommand.startsWith("-")) {
          await getUser(context, subcommand, format);
          return;
        }
        throw new Error(`Unknown subcommand: ${subcommand}`);
    }
  },
};

async function listUsers(context: CommandContext, format: "table" | "json"): Promise<void> {
  const response = await context.client.fetch<UsersResponse>("/users");

  if (format === "json") {
    printJson(response.users);
    return;
  }

  printTable(response.users, [
    { key: "id", header: "ID", width: 36 },
    { key: "firstName", header: "First Name", width: 15 },
    { key: "lastName", header: "Last Name", width: 15 },
    { key: "email", header: "Email", width: 30 },
    { key: "role", header: "Role", width: 12 },
    { key: "status", header: "Status", width: 10 },
  ]);
}

async function getUser(context: CommandContext, userId: string, format: "table" | "json"): Promise<void> {
  const user = await context.client.fetch<User>(`/users/${userId}`);

  if (format === "json") {
    printJson(user);
    return;
  }

  console.log("User Details");
  console.log("────────────");
  console.log(`ID:         ${user.id}`);
  console.log(`Name:       ${user.firstName} ${user.lastName}`);
  console.log(`Email:      ${user.email}`);
  if (user.role) console.log(`Role:       ${user.role}`);
  if (user.status) console.log(`Status:     ${user.status}`);
}
