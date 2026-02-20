import type { Command, CommandContext } from "../types.js";
import { parseOutputFlag, printJson, printTable, formatDateTime } from "../../output.js";

const USAGE = `mercury cards <account-id>
mercury cards --json`;

type Card = {
  cardId: string;
  name?: string;
  status: string;
  lastFourDigits?: string;
  expirationDate?: string;
  createdAt: string;
};

type CardsResponse = {
  cards: Card[];
};

export const cardsCommand: Command = {
  name: "cards",
  description: "List cards for an account.",
  usage: USAGE,
  aliases: ["card"],
  run: async (args, context) => {
    const { format, args: remaining } = parseOutputFlag(args);
    
    const accountId = remaining[0];
    if (!accountId) {
      throw new Error("Missing account ID. Usage: mercury cards <account-id>");
    }

    const response = await context.client.fetch<CardsResponse>(
      `/account/${accountId}/cards`
    );

    if (format === "json") {
      printJson(response.cards);
      return;
    }

    if (response.cards.length === 0) {
      console.log("No cards found for this account.");
      return;
    }

    printTable(response.cards, [
      { key: "cardId", header: "Card ID", width: 36 },
      { key: "name", header: "Name", width: 25 },
      { key: "lastFourDigits", header: "Last 4", width: 8 },
      { key: "status", header: "Status", width: 12 },
      { key: "expirationDate", header: "Expires", width: 10 },
      {
        key: "createdAt",
        header: "Created",
        width: 18,
        format: (v) => formatDateTime(v as string),
      },
    ]);
  },
};
