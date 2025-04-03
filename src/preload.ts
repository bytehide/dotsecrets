import fs from "fs";
import path from "path";
import fg from "fast-glob";
import * as babel from "@babel/core";
import traverse from "@babel/traverse";
import { secretsCache } from "./secretsManager.js";
import { ConsoleUtils } from "./utils/console.js";
import { markPreloadExecuted } from "./secretsProxy.js";

/**
 * Scans the project for references to secrets.keys in the codebase
 * 
 * This function:
 * 1. Collects JavaScript and TypeScript files
 * 2. Parses each file with Babel
 * 3. Traverses the AST looking for secrets.<KEY> patterns
 * 4. Returns a set of all secret keys referenced in the code
 * 
 * @param rootDir - Root directory of the project to scan
 * @returns Set of secret keys found in the project code
 * 
 * @example
 * // Scan the current directory
 * const secretKeys = scanProjectForSecrets(".");
 * console.log(`Found ${secretKeys.size} secret references in your code`);
 */
export function scanProjectForSecrets(rootDir: string = "."): Set<string> {
  const references = new Set<string>();

  // 1. Collect .js, .ts, .jsx, .tsx files (exclude node_modules)
  const patterns = [
    "**/*.{js,ts,jsx,tsx}",         // Only code files
    "!**/*.d.ts",                   // ❌ exclude type declarations
    //"!**/*.test.{ts,js}",           // ❌ exclude test files
    //"!**/__tests__/**",             // ❌ exclude test directories
    //"!**/test/**",                  // ❌ exclude test directories
    "!**/shims/**",                 // ❌ exclude shims
    "!**/polyfills/**",             // ❌ exclude polyfills
    //"!**/*.config.{js,ts}",         // ❌ exclude config files
    "!node_modules/**",             // ❌ exclude node_modules
  ];
  const files = fg.sync(patterns, { cwd: rootDir });

  for (const file of files) {
    const filePath = path.join(rootDir, file);
    const code = fs.readFileSync(filePath, "utf-8");

    // 2. Parse with Babel, enabling multiple syntax plugins
    // 'sourceType: "unambiguous"' attempts to handle both ESM/CJS gracefully
    // The plugins array includes TypeScript, decorators (for Angular), and JSX support
    let ast: any;
    try {
      ast = babel.parseSync(code, {
        sourceType: "unambiguous",
        plugins: [
          ["@babel/plugin-syntax-decorators", { legacy: true }], // Decorators for Angular
          "@babel/plugin-syntax-jsx",                            // JSX for React
          "@babel/plugin-syntax-typescript"                      // TypeScript
        ],
      });
    } catch {}

    if (!ast) continue;

    const traverseParse = (typeof traverse === "function" ? traverse : (traverse as any).default)
    
    // 3. Traverse the AST looking for MemberExpression: secrets.<KEY>
    traverseParse(ast, {
      MemberExpression(path: any) {
        if (
          babel.types.isIdentifier(path.node.object, { name: "secrets" }) &&
          babel.types.isIdentifier(path.node.property)
        ) {
          references.add(path.node.property.name);
        }
      },
    });
  }

  return references;
}

/**
 * Preloads all secrets referenced in the project code to improve performance
 * 
 * Benefits of preloading:
 * - Batches all secret loading operations upfront
 * - Prevents runtime delays when accessing secrets
 * - Allows synchronous access to secrets throughout the application
 * - Can catch missing secrets early in the application lifecycle
 * 
 * This function:
 * 1. Scans code for all references to secrets
 * 2. Filters out secrets already in cache
 * 3. Loads remaining secrets in parallel
 * 4. Marks preload as executed to enable synchronous access
 * 
 * @param rootDir - Root directory of the project to scan for secrets
 * @returns Promise that resolves when all secrets are loaded
 * 
 * @example
 * // In your application startup code:
 * async function initApp() {
 *   await preloadAllSecrets(".");
 *   // Now all secrets are available synchronously
 *   startServer();
 * }
 */
export async function preloadAllSecrets(rootDir: string): Promise<void> {
  ConsoleUtils.debug("Starting preload of secrets");
  
  // 1. Scan the project for all references to secrets.<KEY>
  const references = scanProjectForSecrets(rootDir);
  ConsoleUtils.debug(`Found ${references.size} secret references in code`);

  // 2. Filter out the secrets already in cache
  const keysToLoad: string[] = [];
  for (const key of references) {
    // getSecretSync() verifies if it's already in cache
    if (!secretsCache.getSecretSync(key)) {
      keysToLoad.push(key);
    }
  }

  ConsoleUtils.debug(`Need to load ${keysToLoad.length} secrets that aren't cached`);

  // 3. Load the remaining secrets in parallel
  if (keysToLoad.length > 0) {
    ConsoleUtils.debug(`Loading ${keysToLoad.length} secrets in parallel...`);
    // loadSecret(key) calls remote plugin if not in cache
    await Promise.all(keysToLoad.map((key) => secretsCache.loadSecret(key)));
    ConsoleUtils.success(`Successfully loaded ${keysToLoad.length} secrets`);
  } else {
    ConsoleUtils.success("All secrets already in cache");
  }
  
  // 4. Mark that preload has been executed - enables synchronous access to secrets
  markPreloadExecuted();
  ConsoleUtils.debug("Preload completed");
}