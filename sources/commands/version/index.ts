import type { Command } from "../types.js";

const VERSION = "0.1.0";

export const versionCommand: Command = {
  name: "version",
  description: "Show mercury-cli version.",
  usage: "mercury version",
  aliases: ["v"],
  run: async () => {
    console.log(`mercury-cli v${VERSION}`);
  },
};
