#!/usr/bin/env node

import { Command } from "commander";
import { migrateCommand } from "./commands/migrate.js";
import { setupCommand } from "./commands/setup.js";
import { pushCommand } from "./commands/push.js";
import { syncIDECommand } from "./commands/sync-ide.js";

  const program = new Command();

  program
    .name("dotsecrets")
    .description("dotsecrets CLI")
    .version("0.1.0");

  // Registrar subcomandos
  program.addCommand(migrateCommand);
  program.addCommand(setupCommand);
  program.addCommand(pushCommand);
  program.addCommand(syncIDECommand);
  // Aquí es crucial llamar a parse:
  program.parse(process.argv);