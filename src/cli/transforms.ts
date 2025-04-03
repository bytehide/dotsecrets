// src/cli/transforms.ts
import fs from "fs";
import { transformSync } from "@babel/core";
import { PluginObj } from "@babel/core";
import * as t from "@babel/types";
import template from "@babel/template";
import chalk from "chalk";


/**
 * Reemplaza process.env.X => secrets.X
 * e inserta import { secrets } from "dotsecrets" si no existe.
 */
const processEnvToSecretsPlugin: PluginObj = {
  name: "process-env-to-secrets",
  visitor: {
    Program: {
      enter(path) {
        let hasImport = false;
        for (const node of path.node.body) {
          if (
            t.isImportDeclaration(node) &&
            node.source.value === "dotsecrets" // Ajustar: import { secrets } from "dotsecrets"
          ) {
            // Ver si ya importa 'secrets'
            const spec = node.specifiers.find(
              s => t.isImportSpecifier(s) && t.isIdentifier(s.imported) && s.imported.name === "secrets"
            );
            if (spec) {
              hasImport = true;
              break;
            }
          }
        }
        if (!hasImport) {
          const importAst = template.statement(`import { secrets } from "dotsecrets";`)();
          path.node.body.unshift(importAst);
        }
      }
    },
    MemberExpression(path) {
      // process.env.X => secrets.X
      if (
        t.isMemberExpression(path.node.object) &&
        t.isIdentifier(path.node.object.object, { name: "process" }) &&
        t.isIdentifier(path.node.object.property, { name: "env" })
      ) {
        if (t.isIdentifier(path.node.property)) {
          const keyName = path.node.property.name;
          path.replaceWithSourceString(`secrets.${keyName}`);
        }
      }
    }
  }
};

export function transformFile(filePath: string) {
  const code = fs.readFileSync(filePath, "utf-8");

  // Agregamos presets para TypeScript y React/JSX
  const result = transformSync(code, {
    filename: filePath,
    plugins: [processEnvToSecretsPlugin],
    presets: [
      "@babel/preset-typescript",
      "@babel/preset-react"
    ]
  });

  if (!result?.code) {
    console.log(chalk.yellow(`No code result for ${filePath}, skipping.`));
    return;
  }

  fs.writeFileSync(filePath, result.code, "utf-8");
  console.log(chalk.green(`Transformed ${filePath}`));
}