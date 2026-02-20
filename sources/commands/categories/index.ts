import type { Command, CommandContext } from "../types.js";
import { parseOutputFlag, printJson, printTable } from "../../output.js";

const USAGE = `mercury categories
mercury categories --json`;

type Category = {
  id: string;
  name: string;
  type?: string;
  parentId?: string;
};

type CategoriesResponse = {
  categories: Category[];
};

export const categoriesCommand: Command = {
  name: "categories",
  description: "List transaction categories.",
  usage: USAGE,
  aliases: ["category", "cat"],
  run: async (args, context) => {
    const { format } = parseOutputFlag(args);

    const response = await context.client.fetch<CategoriesResponse>("/categories");

    if (format === "json") {
      printJson(response.categories);
      return;
    }

    printTable(response.categories, [
      { key: "id", header: "ID", width: 36 },
      { key: "name", header: "Name", width: 30 },
      { key: "type", header: "Type", width: 15 },
      { key: "parentId", header: "Parent ID", width: 36 },
    ]);
  },
};
