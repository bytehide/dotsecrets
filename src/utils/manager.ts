import fs from "fs";
import path from "path";
/**
 * Detecta qué gestor de paquetes está usando el usuario (npm, yarn, pnpm, bun)
 */
export function detectPackageManager(): string {
    try {
        const lockFiles = {
            "pnpm-lock.yaml": "pnpm",
            "yarn.lock": "yarn",
            "bun.lockb": "bun",
            "package-lock.json": "npm",
        };
  
        for (const [file, manager] of Object.entries(lockFiles)) {
            if (fs.existsSync(path.resolve(file))) {
                return manager;
            }
        }
  
        return "npm"; // Default a npm si no detecta otro
    } catch (error) {
        return "npm"; // Fallback
    }
}

  /**
 * Generates the install command for the detected package manager.
 * @param packages - The package names to install.
 * @param isDev - Whether to install as dev dependencies.
 * @returns The full install command string.
 */
export function getInstallCommand(packages: string, isDev: boolean = false): string {
    const manager = detectPackageManager();

    const devFlags: Record<string, string | null> = {
        npm: isDev ? "--save-dev" : null,
        yarn: isDev ? "-D" : null,
        pnpm: isDev ? "-D" : null,
        bun: isDev ? "-d" : null,
    };

    const devFlag = devFlags[manager];

    const commandParts = ["install", devFlag, packages].filter(Boolean).join(" ");

    const commands: Record<string, string> = {
        npm: `npm ${commandParts}`,
        yarn: `yarn ${commandParts.replace("install", "add")}`,
        pnpm: `pnpm ${commandParts.replace("install", "add")}`,
        bun: `bun ${commandParts.replace("install", "add")}`,
    };

    return commands[manager];
}

/**
 * Generates the run command for the detected package manager.
 * @param script - The script name to run.
 * @returns The full run command string.
 */
export function getRunCommand(script?: string | null): string {
    const manager = detectPackageManager();

    // Construcción del comando sin espacios adicionales
    const commandParts = ["run", script].filter(Boolean).join(" ");

    const commands: Record<string, string> = {
        npm: `npm ${commandParts}`.trim(),
        yarn: `yarn ${script ?? ""}`.trim(),
        pnpm: `pnpm ${commandParts}`.trim(),
        bun: `bun ${commandParts}`.trim(),
    };

    return commands[manager];
}