import type { Command, CommandContext } from "../types.js";
import { parseOutputFlag, printJson, printTable, truncate } from "../../output.js";

const USAGE = `mercury recipients
mercury recipients list
mercury recipients get <recipient-id>
mercury recipients add --name <name> --account <account-num> --routing <routing-num> [options]
mercury recipients delete <recipient-id>
mercury recipients --json`;

type Recipient = {
  id: string;
  name: string;
  emails?: string[];
  electronicRoutingInfo?: {
    accountNumber: string;
    routingNumber: string;
    bankName?: string;
    electronicAccountType?: string;
  };
  address?: {
    address1: string;
    address2?: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  };
  createdAt: string;
};

type RecipientsResponse = {
  recipients: Recipient[];
  total?: number;
};

export const recipientsCommand: Command = {
  name: "recipients",
  description: "List, view, add, and delete payment recipients.",
  usage: USAGE,
  aliases: ["recipient", "recip"],
  run: async (args, context) => {
    const { format, args: remaining } = parseOutputFlag(args);
    const subcommand = remaining[0] ?? "list";

    switch (subcommand) {
      case "list":
        await listRecipients(context, parseListOptions(remaining.slice(1)), format);
        return;
      case "get":
        const recipientId = remaining[1];
        if (!recipientId) {
          throw new Error("Missing recipient ID. Usage: mercury recipients get <recipient-id>");
        }
        await getRecipient(context, recipientId, format);
        return;
      case "add":
        const addOptions = parseAddOptions(remaining.slice(1));
        await addRecipient(context, addOptions, format);
        return;
      case "delete":
        const deleteId = remaining[1];
        if (!deleteId) {
          throw new Error("Missing recipient ID. Usage: mercury recipients delete <recipient-id>");
        }
        await deleteRecipient(context, deleteId);
        return;
      default:
        throw new Error(`Unknown subcommand: ${subcommand}. Use 'list', 'get', 'add', or 'delete'.`);
    }
  },
};

type ListOptions = {
  limit?: number;
  offset?: number;
};

function parseListOptions(args: readonly string[]): ListOptions {
  const options: ListOptions = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--limit") {
      const value = args[++i];
      if (!value) throw new Error("--limit requires a value");
      options.limit = parseInt(value, 10);
    } else if (arg === "--offset") {
      const value = args[++i];
      if (!value) throw new Error("--offset requires a value");
      options.offset = parseInt(value, 10);
    } else if (arg?.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  return options;
}

type AddOptions = {
  name: string;
  accountNumber: string;
  routingNumber: string;
  bankName?: string;
  accountType?: string;
  emails?: string[];
  address1?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
};

function parseAddOptions(args: readonly string[]): AddOptions {
  let name: string | undefined;
  let accountNumber: string | undefined;
  let routingNumber: string | undefined;
  let bankName: string | undefined;
  let accountType: string | undefined;
  const emails: string[] = [];
  let address1: string | undefined;
  let city: string | undefined;
  let region: string | undefined;
  let postalCode: string | undefined;
  let country: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--name") {
      name = args[++i];
      if (!name) throw new Error("--name requires a value");
    } else if (arg === "--account") {
      accountNumber = args[++i];
      if (!accountNumber) throw new Error("--account requires a value");
    } else if (arg === "--routing") {
      routingNumber = args[++i];
      if (!routingNumber) throw new Error("--routing requires a value");
    } else if (arg === "--bank-name") {
      bankName = args[++i];
      if (!bankName) throw new Error("--bank-name requires a value");
    } else if (arg === "--account-type") {
      accountType = args[++i];
      if (!accountType) throw new Error("--account-type requires a value");
    } else if (arg === "--email") {
      const email = args[++i];
      if (!email) throw new Error("--email requires a value");
      emails.push(email);
    } else if (arg === "--address") {
      address1 = args[++i];
      if (!address1) throw new Error("--address requires a value");
    } else if (arg === "--city") {
      city = args[++i];
      if (!city) throw new Error("--city requires a value");
    } else if (arg === "--region") {
      region = args[++i];
      if (!region) throw new Error("--region requires a value");
    } else if (arg === "--postal-code") {
      postalCode = args[++i];
      if (!postalCode) throw new Error("--postal-code requires a value");
    } else if (arg === "--country") {
      country = args[++i];
      if (!country) throw new Error("--country requires a value");
    } else if (arg?.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!name) throw new Error("Missing required --name");
  if (!accountNumber) throw new Error("Missing required --account");
  if (!routingNumber) throw new Error("Missing required --routing");

  return {
    name,
    accountNumber,
    routingNumber,
    bankName,
    accountType,
    emails: emails.length > 0 ? emails : undefined,
    address1,
    city,
    region,
    postalCode,
    country,
  };
}

async function listRecipients(
  context: CommandContext,
  options: ListOptions,
  format: "table" | "json"
): Promise<void> {
  const params = new URLSearchParams();
  if (options.limit) params.set("limit", String(options.limit));
  if (options.offset) params.set("offset", String(options.offset));

  const query = params.toString();
  const path = `/recipients${query ? `?${query}` : ""}`;
  
  const response = await context.client.fetch<RecipientsResponse>(path);

  if (format === "json") {
    printJson(response.recipients);
    return;
  }

  printTable(response.recipients, [
    { key: "id", header: "ID", width: 36 },
    { key: "name", header: "Name", width: 30 },
    {
      key: "electronicRoutingInfo",
      header: "Account",
      width: 15,
      format: (v) => {
        const info = v as Recipient["electronicRoutingInfo"];
        return info?.accountNumber ? `...${info.accountNumber.slice(-4)}` : "-";
      },
    },
    {
      key: "emails",
      header: "Email",
      width: 30,
      format: (v) => {
        const emails = v as string[] | undefined;
        return emails?.[0] ? truncate(emails[0], 30) : "-";
      },
    },
  ]);
}

async function getRecipient(
  context: CommandContext,
  recipientId: string,
  format: "table" | "json"
): Promise<void> {
  const recipient = await context.client.fetch<Recipient>(`/recipient/${recipientId}`);

  if (format === "json") {
    printJson(recipient);
    return;
  }

  console.log("Recipient Details");
  console.log("─────────────────");
  console.log(`ID:              ${recipient.id}`);
  console.log(`Name:            ${recipient.name}`);
  if (recipient.emails?.length) {
    console.log(`Emails:          ${recipient.emails.join(", ")}`);
  }
  if (recipient.electronicRoutingInfo) {
    const info = recipient.electronicRoutingInfo;
    console.log(`Account Number:  ${info.accountNumber}`);
    console.log(`Routing Number:  ${info.routingNumber}`);
    if (info.bankName) console.log(`Bank Name:       ${info.bankName}`);
    if (info.electronicAccountType) console.log(`Account Type:    ${info.electronicAccountType}`);
  }
  if (recipient.address) {
    const addr = recipient.address;
    console.log(`Address:         ${addr.address1}`);
    if (addr.address2) console.log(`                 ${addr.address2}`);
    console.log(`                 ${addr.city}, ${addr.region} ${addr.postalCode}`);
    console.log(`                 ${addr.country}`);
  }
}

async function addRecipient(
  context: CommandContext,
  options: AddOptions,
  format: "table" | "json"
): Promise<void> {
  const body: Record<string, unknown> = {
    name: options.name,
    electronicRoutingInfo: {
      accountNumber: options.accountNumber,
      routingNumber: options.routingNumber,
      ...(options.bankName && { bankName: options.bankName }),
      ...(options.accountType && { electronicAccountType: options.accountType }),
    },
  };

  if (options.emails) {
    body.emails = options.emails;
  }

  if (options.address1 && options.city && options.region && options.postalCode && options.country) {
    body.address = {
      address1: options.address1,
      city: options.city,
      region: options.region,
      postalCode: options.postalCode,
      country: options.country,
    };
  }

  const recipient = await context.client.fetch<Recipient>("/recipients", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (format === "json") {
    printJson(recipient);
    return;
  }

  console.log("Recipient Created");
  console.log("─────────────────");
  console.log(`ID:   ${recipient.id}`);
  console.log(`Name: ${recipient.name}`);
}

async function deleteRecipient(context: CommandContext, recipientId: string): Promise<void> {
  await context.client.fetch(`/recipient/${recipientId}`, {
    method: "DELETE",
  });

  console.log(`Recipient ${recipientId} deleted.`);
}
