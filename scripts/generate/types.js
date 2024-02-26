#!/usr/bin/env node --enable-source-maps --experimental-specifier-resolution=node

import { Command } from "@toridoriv/cliffy";

import * as helpers from "../helpers/index.js";

// eslint-disable-next-line no-unused-vars
const { logger, inspect, typebox } = helpers;

const types = new Command()
  .name("generate:types")
  .description("DESCRIBE_HERE")
  .action(async function handle() {
    logger.info("Initializing the program generator...");

    const generator = new typebox.ProgramGenerator();

    logger.debug(`${generator.builders.length} builder classes found.`);

    logger.debug(`${generator.methods.length} methods found.`);

    logger.info("Creating builder file...");

    generator.writeToFile("./lib/builder.js");
  });

types.parse(process.argv.slice(2));
