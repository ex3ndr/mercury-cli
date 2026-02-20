import type { Command, CommandContext } from "../types.js";
import { parseOutputFlag, printJson } from "../../output.js";

const USAGE = `mercury organization
mercury org
mercury organization --json`;

type Organization = {
  id: string;
  legalBusinessName: string;
  ein?: string;
  dbas?: string[];
  address?: {
    address1: string;
    address2?: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  };
};

export const organizationCommand: Command = {
  name: "organization",
  description: "Get organization details (EIN, legal name, DBAs).",
  usage: USAGE,
  aliases: ["org"],
  run: async (args, context) => {
    const { format } = parseOutputFlag(args);

    const org = await context.client.fetch<Organization>("/organization");

    if (format === "json") {
      printJson(org);
      return;
    }

    console.log("Organization Details");
    console.log("────────────────────");
    console.log(`ID:          ${org.id}`);
    console.log(`Legal Name:  ${org.legalBusinessName}`);
    if (org.ein) console.log(`EIN:         ${org.ein}`);
    if (org.dbas?.length) console.log(`DBAs:        ${org.dbas.join(", ")}`);
    if (org.address) {
      console.log(`Address:     ${org.address.address1}`);
      if (org.address.address2) console.log(`             ${org.address.address2}`);
      console.log(`             ${org.address.city}, ${org.address.region} ${org.address.postalCode}`);
      console.log(`             ${org.address.country}`);
    }
  },
};
