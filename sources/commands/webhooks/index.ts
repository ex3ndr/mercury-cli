import type { Command, CommandContext } from "../types.js";
import { parseOutputFlag, printJson, printTable, truncate } from "../../output.js";

const USAGE = `mercury webhooks
mercury webhooks list
mercury webhooks get <webhook-id>
mercury webhooks create --url <url> [--events <event1,event2>]
mercury webhooks update <webhook-id> [--url <url>] [--events <events>] [--status <status>]
mercury webhooks delete <webhook-id>
mercury webhooks verify <webhook-id>
mercury webhooks --json`;

type Webhook = {
  id: string;
  url: string;
  status: string;
  events?: string[];
  secret?: string;
  createdAt: string;
};

type WebhooksResponse = {
  webhooks: Webhook[];
};

export const webhooksCommand: Command = {
  name: "webhooks",
  description: "Manage webhook endpoints.",
  usage: USAGE,
  aliases: ["webhook", "wh"],
  run: async (args, context) => {
    const { format, args: remaining } = parseOutputFlag(args);
    const subcommand = remaining[0] ?? "list";

    switch (subcommand) {
      case "list":
        await listWebhooks(context, format);
        return;
      case "get":
        const getId = remaining[1];
        if (!getId) throw new Error("Missing webhook ID");
        await getWebhook(context, getId, format);
        return;
      case "create":
        await createWebhook(context, parseCreateOptions(remaining.slice(1)), format);
        return;
      case "update":
        const updateId = remaining[1];
        if (!updateId) throw new Error("Missing webhook ID");
        await updateWebhook(context, updateId, parseUpdateOptions(remaining.slice(2)), format);
        return;
      case "delete":
        const deleteId = remaining[1];
        if (!deleteId) throw new Error("Missing webhook ID");
        await deleteWebhook(context, deleteId);
        return;
      case "verify":
        const verifyId = remaining[1];
        if (!verifyId) throw new Error("Missing webhook ID");
        await verifyWebhook(context, verifyId);
        return;
      default:
        throw new Error(`Unknown subcommand: ${subcommand}`);
    }
  },
};

type CreateOptions = {
  url: string;
  events?: string[];
  secret?: string;
};

function parseCreateOptions(args: readonly string[]): CreateOptions {
  let url: string | undefined;
  let events: string[] | undefined;
  let secret: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--url") {
      url = args[++i];
      if (!url) throw new Error("--url requires a value");
    } else if (arg === "--events") {
      const value = args[++i];
      if (!value) throw new Error("--events requires a value");
      events = value.split(",").map((e) => e.trim());
    } else if (arg === "--secret") {
      secret = args[++i];
      if (!secret) throw new Error("--secret requires a value");
    } else if (arg?.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!url) throw new Error("Missing required --url");
  return { url, events, secret };
}

type UpdateOptions = {
  url?: string;
  events?: string[];
  status?: string;
};

function parseUpdateOptions(args: readonly string[]): UpdateOptions {
  const options: UpdateOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--url") {
      options.url = args[++i];
      if (!options.url) throw new Error("--url requires a value");
    } else if (arg === "--events") {
      const value = args[++i];
      if (!value) throw new Error("--events requires a value");
      options.events = value.split(",").map((e) => e.trim());
    } else if (arg === "--status") {
      options.status = args[++i];
      if (!options.status) throw new Error("--status requires a value");
    } else if (arg?.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

async function listWebhooks(context: CommandContext, format: "table" | "json"): Promise<void> {
  const response = await context.client.fetch<WebhooksResponse>("/webhooks");

  if (format === "json") {
    printJson(response.webhooks);
    return;
  }

  if (response.webhooks.length === 0) {
    console.log("No webhooks configured.");
    return;
  }

  printTable(response.webhooks, [
    { key: "id", header: "ID", width: 36 },
    { key: "url", header: "URL", width: 40, format: (v) => truncate(String(v), 40) },
    { key: "status", header: "Status", width: 10 },
    {
      key: "events",
      header: "Events",
      width: 30,
      format: (v) => {
        const events = v as string[] | undefined;
        return events ? truncate(events.join(", "), 30) : "all";
      },
    },
  ]);
}

async function getWebhook(
  context: CommandContext,
  webhookId: string,
  format: "table" | "json"
): Promise<void> {
  const webhook = await context.client.fetch<Webhook>(`/webhooks/${webhookId}`);

  if (format === "json") {
    printJson(webhook);
    return;
  }

  console.log("Webhook Details");
  console.log("───────────────");
  console.log(`ID:      ${webhook.id}`);
  console.log(`URL:     ${webhook.url}`);
  console.log(`Status:  ${webhook.status}`);
  console.log(`Events:  ${webhook.events?.join(", ") ?? "all"}`);
  if (webhook.secret) {
    console.log(`Secret:  ${webhook.secret.slice(0, 8)}...`);
  }
}

async function createWebhook(
  context: CommandContext,
  options: CreateOptions,
  format: "table" | "json"
): Promise<void> {
  const body: Record<string, unknown> = { url: options.url };
  if (options.events) body.events = options.events;
  if (options.secret) body.secret = options.secret;

  const webhook = await context.client.fetch<Webhook>("/webhooks", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (format === "json") {
    printJson(webhook);
    return;
  }

  console.log("Webhook Created");
  console.log("───────────────");
  console.log(`ID:     ${webhook.id}`);
  console.log(`URL:    ${webhook.url}`);
  console.log(`Status: ${webhook.status}`);
}

async function updateWebhook(
  context: CommandContext,
  webhookId: string,
  options: UpdateOptions,
  format: "table" | "json"
): Promise<void> {
  const body: Record<string, unknown> = {};
  if (options.url) body.url = options.url;
  if (options.events) body.events = options.events;
  if (options.status) body.status = options.status;

  const webhook = await context.client.fetch<Webhook>(`/webhooks/${webhookId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

  if (format === "json") {
    printJson(webhook);
    return;
  }

  console.log("Webhook Updated");
  console.log("───────────────");
  console.log(`ID:     ${webhook.id}`);
  console.log(`URL:    ${webhook.url}`);
  console.log(`Status: ${webhook.status}`);
}

async function deleteWebhook(context: CommandContext, webhookId: string): Promise<void> {
  await context.client.fetch(`/webhooks/${webhookId}`, { method: "DELETE" });
  console.log(`Webhook ${webhookId} deleted.`);
}

async function verifyWebhook(context: CommandContext, webhookId: string): Promise<void> {
  await context.client.fetch(`/webhooks/${webhookId}/verify`, { method: "POST" });
  console.log(`Webhook ${webhookId} verification triggered.`);
}
