/* TS */
interface Command {
  disabled?: boolean;
  args: Array<string>;
  name: string;
}

interface Tasks {
  [key: string]: Command;
}

/* IMPORTS & VARS */
const { spawn } = require("node:child_process");
require("dotenv").config();
const prod: boolean = process.env.NODE_ENV === "production";
const tasks: Tasks = {};
const commands: Array<Command> = [];

/* INIT */
const init: Function = async () => {
  execute(commands);
};

/* EXEC */
const execute: Function = (runCommands: Array<Command>) => {
  for (const command of runCommands) {
    if (!command.disabled) {
      const args: Array<string> = command.args.slice();
      const cmd: string = args.shift() || "";
      const name: string = command.name;

      console.info(`Running: ${name} (${cmd} ${args.join(" ")})`);

      const exec = spawn(cmd, args);
      const stdChunks: Array<string> = [];
      const stdErrChunks: Array<string> = [];

      exec.stdout.on("data", (stdout: string) => {
        if (stdout && /[\w\-]+/.test(stdout)) console.log(`${stdout}`.trim());
      });

      exec.stderr.on("data", (error: string) => {
        if (error && /[\w+\-]/.test(error)) console.warn(`${name}: ${error}`.trim());
      });

      exec.on("close", (code: number) => {
        if (code === 0) {
          console.log(`Complete: ${name}`);
        } else {
          process.exit();
        }
      });
    }
  }
};

/* Build: _dist */
tasks.dist = {
  name: "mkdir:_dist",
  args: ["mkdir", "-p", "_dist"],
  // disabled: true,
};
commands.push(tasks.dist);

/* Build: css */
tasks.css = {
  name: "tailwind",
  args: ["npx", "tailwindcss", "-i", "_src/input.css", "-o", "_dist/output.css"],
  // disabled: true,
};
if (prod) tasks.css.args.push("--minify");
commands.push(tasks.css);

/* Build: html */
tasks.html = {
  name: "html-minifier",
  args: [
    "npx",
    "html-minifier",
    "--collapse-whitespace",
    "--remove-optional-tags",
    "--remove-comments",
    "--remove-redundant-attributes",
    "--remove-script-type-attributes",
    "--remove-tag-whitespace",
    "--minify-js",
    "--output",
    "_dist/index.html",
    "_src/index.html"
  ],
  // disabled: true,
};
commands.push(tasks.html);

/* DEV */

/* BROWSER-SYNC */
const bs = require("browser-sync");
if (bs.active) bs.exit(); // kill browser-sync
tasks.browserStart = {
  name: "browser-sync",
  args: [
    "npx",
    "browser-sync",
    "start",
    "--server",
    "_dist",
    "--port",
    "8080",
    "--no-open",
    "--no-ui",
    "--no-notify",
  ],
  // disabled: true,
};
if (!prod) commands.push(tasks.browserStart);

tasks.browserReload = {
  name: "browser-sync:reload",
  args: ["npx", "browser-sync", "reload", "--port", "8080"],
};

/* WATCH */
if (!prod) {
  const watch = require("node-watch");
  const watchOptions = {
    recursive: true,
    filter: /\.(css|js|html)$/,
  };
  watch("_src", watchOptions, (evt: string, name: string) => {
    if (evt === "update") {
      for (const ext of ["css", "html", "js"]) {
        // Iterate over extensions, build if extension was saved
        const re = new RegExp(`\\.${ext}$`);
        if (re.test(name)) execute([tasks[ext]]);
      }
      // Also run tailwind for js/html
      if (/html|js$/.test(name)) execute([tasks.css]);
      // Reload browsers
      execute([tasks.browserReload]);
    }
  });
}

/* let's go */
init();
