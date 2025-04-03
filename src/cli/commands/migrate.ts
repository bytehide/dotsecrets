import { Command } from "commander";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import boxen from "boxen";
import inquirer from "inquirer";
import fg from "fast-glob";
import { parseEnvFile, uninstallDotenv, writeDotSecrets } from "../utils.js";
import { transformFile } from "../transforms.js";
import { removeDotenvReferences } from "../removeDotenvReferences.js";

export const migrateCommand = new Command("migrate")
  .description(
    "Wizard to migrate from .env files to .secrets, and transform process.env references to secrets."
  )
  .option(
    "--path <folder>",
    "Folder path to search for .env files (default: current directory)",
    "."
  )
  .action(async (opts) => {
    console.log(chalk.cyan("Welcome to the DotSecrets Migration Wizard!"));

    // 1. Leer la opción --path y buscar .env* en esa carpeta
    const folder = path.resolve(opts.path);
    console.log(chalk.gray(`Searching for .env files in: ${folder}`));

    // Detectar archivos .env*, excepto .example, .sample, .template
    const envFiles = await fg(
      [".env*", "!*.example", "!*.sample", "!*.template"],
      {
        dot: true,
        cwd: folder,
      }
    );

    if (envFiles.length === 0) {
      // Si no hay archivos .env, no hacemos prompt de selección
      console.log(
        chalk.yellow(
          "No .env files detected in this folder. Skipping environment file migration."
        )
      );
    } else {
      // Mostrar qué archivos detectamos
      const detectedList = envFiles.map((f) => path.join(folder, f)).join("\n");
      console.log(
        chalk.magenta(`Detected the following .env files:\n${detectedList}\n`)
      );

      // 2. Preguntar al usuario qué .env files quiere migrar
      const { selectedEnvFiles } = await inquirer.prompt([
        {
          type: "checkbox",
          name: "selectedEnvFiles",
          message:
            "Select which .env files you want to migrate to .secrets equivalents:",
          choices: envFiles.map((f) => ({
            name: path.join(folder, f),
            value: f,
          })),
          default: envFiles,
        },
      ]);

      if (selectedEnvFiles.length === 0) {
        console.log(
          chalk.yellow(
            "No files selected. Skipping environment file migration."
          )
        );
      } else {
        // Para cada archivo .env seleccionado, proponemos un nombre .secrets
        for (const envFile of selectedEnvFiles) {
          // envFile es relativo a folder
          const fullEnvPath = path.join(folder, envFile);

          // Ejemplo: .env.local => .secrets.local
          const secretsFile = path.join(
            folder,
            envFile.replace(/^\.env/, ".secrets")
          );

          const { confirmMigrate } = await inquirer.prompt([
            {
              type: "confirm",
              name: "confirmMigrate",
              message: `Migrate ${fullEnvPath} => ${secretsFile}?`,
              default: true,
            },
          ]);
          if (!confirmMigrate) {
            console.log(chalk.gray(`Skipping ${fullEnvPath}.`));
            continue;
          }

          // Parsear .env y escribir .secrets
          const raw = fs.readFileSync(fullEnvPath, "utf-8");
          const vars = parseEnvFile(raw);
          writeDotSecrets(vars, secretsFile);

          console.log(
            chalk.green(`Created ${secretsFile} from ${fullEnvPath}.`)
          );
        }
      }
    }

    // 3. Preguntar si queremos transformar el código
    const { transformCode } = await inquirer.prompt([
      {
        type: "confirm",
        name: "transformCode",
        message:
          "Do you want to replace 'process.env.*' with 'secrets.*' in your code?",
        default: true,
      },
    ]);

    if (!transformCode) {
      console.log(chalk.gray("Skipping code transformation."));
    } else {
      // 4. Detectar archivos .ts, .js, .tsx, .jsx en la carpeta
      const ignorePatterns = [
        "**/node_modules/**",
        "**/dist/**",
        "**/build/**",
        "**/coverage/**",
      ];

      console.log(
        chalk.gray(
          "Scanning for .ts, .js, .tsx, .jsx files that contain 'process.env.'..."
        )
      );

      const pattern = "**/*.{ts,js,tsx,jsx}";
      // Conviertes cada `ignorePattern` en un patrón negativo con `!`
      const negativePatterns = ignorePatterns.map((p) => `!${p}`);

      // Usas fast-glob con:
      //  - el patrón principal (pattern)
      //  - los patrones negativos para excluir
      //  - `cwd: folder` si quieres basarte en el --path
      const allFiles = await fg([pattern, ...negativePatterns], {
        cwd: folder,
        dot: true,
      });

      // Filtrar solo los que contengan "process.env."
      const filesToTransform: string[] = [];
      for (const file of allFiles) {
        const fullFilePath = path.join(folder, file);
        const content = fs.readFileSync(fullFilePath, "utf-8");
        if (content.includes("process.env.")) {
          filesToTransform.push(fullFilePath);
        }
      }

      if (filesToTransform.length === 0) {
        console.log(
          chalk.yellow(
            "No files found that reference process.env. Skipping transformation."
          )
        );
      } else {
        console.log(
          chalk.magenta(
            `Will transform the following files (they reference process.env.):\n${filesToTransform.join(
              "\n"
            )}\n`
          )
        );

        const { confirmTransform } = await inquirer.prompt([
          {
            type: "confirm",
            name: "confirmTransform",
            message: "Proceed with transformation?",
            default: true,
          },
        ]);

        if (!confirmTransform) {
          console.log(chalk.gray("Transformation cancelled."));
        } else {
          for (const file of filesToTransform) {
            transformFile(file);
          }
          console.log(chalk.green(`Transformation complete!`));
        }
      }
    }

    // 5. Preguntar si queremos eliminar dotenv
    const { removeDotenv } = await inquirer.prompt([
      {
        type: "confirm",
        name: "removeDotenv",
        message:
          "Do you want to remove references to 'dotenv' and uninstall the package?",
        default: true,
      },
    ]);

    if (removeDotenv) {
      // a) Buscar y eliminar require('dotenv').config() o imports de dotenv
      await removeDotenvReferences(folder);

      // b) Desinstalar el paquete
      const { confirmUninstall } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirmUninstall",
          message:
            "Should we run 'npm uninstall dotenv' (or 'yarn remove dotenv')?",
          default: true,
        },
      ]);

      if (confirmUninstall) {
        uninstallDotenv(folder);
      }
    }

    // Mensaje final
    console.log(
      boxen(chalk.greenBright("Migration wizard completed!"), {
        padding: 1,
        borderStyle: "round",
        borderColor: "green",
      })
    );
  });
