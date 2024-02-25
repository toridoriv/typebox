#!/usr/bin/env node
import fs from "node:fs";
import { createRequire } from "node:module";

import { Command, Select } from "@toridoriv/cliffy";
import { Template } from "@toridoriv/toolkit";

const require = createRequire(import.meta.url);
const script = new Command()
  .name("create:scripts")
  .description("Create a new script for this project")
  .option(
    "-d --directory <directory:string>",
    "The directory in which to create the new script.",
    {
      required: true,
    },
  )
  .option("-n --name <name:string>", "The name of the script.", {
    required: true,
  })
  .action(async function handle(options) {
    const directory = `./scripts/${options.directory}`;
    const pkg = require("../../package.json");
    const lang = await Select.prompt({
      message: "Select a language",
      options: [{ name: "JavaScript", value: "js" }],
      default: "JavaScript",
    });
    const template = fs.readFileSync(`./templates/script.${lang}.txt`, "utf-8");
    const fileContent = new Template(template, ["{{", "}}"]).render(options);

    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    const path = `${directory}/${options.name}.${lang}`;

    fs.writeFileSync(path, fileContent, "utf-8");

    Object.defineProperty(pkg.scripts, `${options.directory}:${options.name}`, {
      value: "scripty",
      enumerable: true,
    });

    fs.writeFileSync("./package.json", JSON.stringify(pkg, null, 2), "utf-8");
  });

script.parse(process.argv.slice(2));
