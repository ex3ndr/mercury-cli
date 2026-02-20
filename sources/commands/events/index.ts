import type { Command, CommandContext } from "../types.js";
import { parseOutputFlag, printJson, printTable, formatDateTime, truncate } from "../../output.js";

const USAGE = `mercury events
mercury events list [--limit N] [--type <type>]
mercury events get <event-id>
mercury events --json`;

type ApiEvent = {
  id: string;
  resourceType: string;
  resourceId: string;
  operationType: string;
  occurredAt: string;
  changedPaths?: string[];
};

type EventsResponse = {
  events: ApiEvent[];
  total?: number;
};

export const eventsCommand: Command = {
  name: "events",
  description: "List and view API events (audit trail).",
  usage: USAGE,
  aliases: ["event"],
  run: async (args, context) => {
    const { format, args: remaining } = parseOutputFlag(args);
    const subcommand = remaining[0] ?? "list";

    switch (subcommand) {
      case "list":
        await listEvents(context, parseListOptions(remaining.slice(1)), format);
        return;
      case "get":
        const eventId = remaining[1];
        if (!eventId) throw new Error("Missing event ID");
        await getEvent(context, eventId, format);
        return;
      default:
        // Could be an event ID directly
        if (!subcommand.startsWith("-")) {
          await getEvent(context, subcommand, format);
          return;
        }
        throw new Error(`Unknown subcommand: ${subcommand}`);
    }
  },
};

type ListOptions = {
  limit?: number;
  offset?: number;
  type?: string;
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
    } else if (arg === "--type") {
      const value = args[++i];
      if (!value) throw new Error("--type requires a value");
      options.type = value;
    } else if (arg?.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

async function listEvents(
  context: CommandContext,
  options: ListOptions,
  format: "table" | "json"
): Promise<void> {
  const params = new URLSearchParams();
  if (options.limit) params.set("limit", String(options.limit));
  if (options.offset) params.set("offset", String(options.offset));
  if (options.type) params.set("type", options.type);

  const query = params.toString();
  const path = `/events${query ? `?${query}` : ""}`;

  const response = await context.client.fetch<EventsResponse>(path);

  if (format === "json") {
    printJson(response.events);
    return;
  }

  if (response.events.length === 0) {
    console.log("No events found.");
    return;
  }

  printTable(response.events, [
    { key: "id", header: "Event ID", width: 36 },
    { key: "resourceType", header: "Resource", width: 18 },
    { key: "operationType", header: "Operation", width: 10 },
    { key: "resourceId", header: "Resource ID", width: 20, format: (v) => truncate(String(v), 20) },
    {
      key: "occurredAt",
      header: "Occurred",
      width: 18,
      format: (v) => formatDateTime(v as string),
    },
  ]);
}

async function getEvent(
  context: CommandContext,
  eventId: string,
  format: "table" | "json"
): Promise<void> {
  const event = await context.client.fetch<ApiEvent>(`/event/${eventId}`);

  if (format === "json") {
    printJson(event);
    return;
  }

  console.log("Event Details");
  console.log("─────────────");
  console.log(`ID:            ${event.id}`);
  console.log(`Resource Type: ${event.resourceType}`);
  console.log(`Resource ID:   ${event.resourceId}`);
  console.log(`Operation:     ${event.operationType}`);
  console.log(`Occurred At:   ${formatDateTime(event.occurredAt)}`);
  if (event.changedPaths?.length) {
    console.log(`Changed Paths: ${event.changedPaths.join(", ")}`);
  }
}
