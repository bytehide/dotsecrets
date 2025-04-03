// removeDotenvReferences.ts (puedes ponerlo en transforms.ts o similar)

import fs from "fs";
import path from "path";
import fg from "fast-glob";
import { transformSync, PluginObj } from "@babel/core";
import * as t from "@babel/types";
import chalk from "chalk";

const removeDotenvPlugin: PluginObj = {
  name: "remove-dotenv-plugin",
  visitor: {
    ImportDeclaration(path) {
      // import dotenv from "dotenv"
      if (path.node.source.value === "dotenv") {
        // Eliminamos la declaración entera
        path.remove();
      }
    },
    VariableDeclaration(path) {
      // const dotenv = require('dotenv');
      // Buscamos require("dotenv")
      if (!t.isVariableDeclarator(path.node.declarations[0])) return;
      const decl = path.node.declarations[0];
      if (
        t.isCallExpression(decl.init) &&
        t.isIdentifier(decl.init.callee, { name: "require" }) &&
        decl.init.arguments.length === 1 &&
        t.isStringLiteral(decl.init.arguments[0], { value: "dotenv" })
      ) {
        path.remove();
      }
    },
    ExpressionStatement(path) {
      // require('dotenv').config()
      // or dotenv.config()
      const expr = path.node.expression;
      if (!t.isCallExpression(expr)) return;

      // A) require('dotenv').config()
      if (
        t.isMemberExpression(expr.callee) &&
        t.isCallExpression(expr.callee.object) &&
        t.isIdentifier(expr.callee.object.callee, { name: "require" }) &&
        expr.callee.object.arguments.length === 1 &&
        t.isStringLiteral(expr.callee.object.arguments[0], { value: "dotenv" }) &&
        t.isIdentifier(expr.callee.property, { name: "config" })
      ) {
        path.remove();
      }

      // B) dotenv.config()
      // Podríamos detectar si la callee es: dotenv.config()
      // => requires tracking if "dotenv" was declared. Este caso se elimina si ya removimos la import/require
      // pero si se define en otro scope, podríamos hacer algo extra. 
    }
  }
};

/**
 * Recorre la carpeta 'folder', busca .ts, .js, .tsx, .jsx,
 * y elimina referencias a dotenv (import/require).
 */
export async function removeDotenvReferences(folder: string) {
  const pattern = "**/*.{ts,js,tsx,jsx}";
  const ignorePatterns = ["**/node_modules/**", "**/dist/**", "**/build/**", "**/coverage/**"];
  const negativePatterns = ignorePatterns.map(p => `!${p}`);

  const allFiles = await fg([pattern, ...negativePatterns], { cwd: folder, dot: true });
  let count = 0;

  for (const file of allFiles) {
    const fullFilePath = path.join(folder, file);
    const code = fs.readFileSync(fullFilePath, "utf-8");

    if (!code.includes("dotenv")) {
      continue; // no references to 'dotenv'
    }

    const result = transformSync(code, {
      filename: fullFilePath,
      plugins: [removeDotenvPlugin]
    });

    if (result?.code && result.code !== code) {
      fs.writeFileSync(fullFilePath, result.code, "utf-8");
      count++;
    }
  }

  console.log(chalk.green(`Removed dotenv references in ${count} file(s).`));
}