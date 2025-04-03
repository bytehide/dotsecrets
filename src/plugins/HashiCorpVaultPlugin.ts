import { ISecretsPlugin } from "./ISecretsPlugin.js";
import chalk from "chalk";
import boxen from "boxen";
import { ConsoleUtils } from "../utils/console.js";
import { BaseSecretsPlugin } from "./BaseSecretsPlugin.js";
import { ensureAndPersistEnvVars, ensurePackageInstalled, ensureVariables, filterSecretsWithExclusions, forceSetVars } from "../cli/utils.js";
import pLimit from "p-limit";
import cliProgress from "cli-progress";
import type * as NodeVault from "node-vault";
import inquirer from "inquirer";
import fetch from "node-fetch";

/**
 * Configuration options for HashiCorp Vault plugin.
 */
interface VaultPluginOptions {
  /** URL of the Vault server */
  endpoint?: string;
  /** Vault token for authentication */
  token?: string;
}

/**
 * HashiCorpVaultPlugin manages secrets using HashiCorp Vault.
 *
 * @class
 * @extends BaseSecretsPlugin
 * @implements ISecretsPlugin
 * @description
 * Provides functionality to retrieve (async & sync stub), push, and setup secrets in HashiCorp Vault.
 * Supports both HCP-managed and self-hosted Vault.
 * Requires one of the following environment sets:
 * - Self-hosted: VAULT_ADDR + VAULT_TOKEN
 * - HCP: HCP_CLIENT_ID + HCP_CLIENT_SECRET
 */
export class HashiCorpVaultPlugin extends BaseSecretsPlugin implements ISecretsPlugin {
  pluginName = "HashiCorp Vault";
  private mode: "hcp" | "vault" = "vault";
  private token?: string;
  private orgId?: string;
  private projectId?: string;
  private appId?: string;
  private vaultClient?: any;
  private initialized?: Promise<void>;

  constructor(options: VaultPluginOptions = {}, skip = false) {
    super();
    if (!skip) this.initialized = this.initializeClient();
  }

  private async initializeClient(): Promise<void> {
    if (process.env.HCP_CLIENT_ID && process.env.HCP_CLIENT_SECRET) {
      this.mode = "hcp";

      const response = await fetch("https://auth.idp.hashicorp.com/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.HCP_CLIENT_ID,
          client_secret: process.env.HCP_CLIENT_SECRET,
          grant_type: "client_credentials",
          audience: "https://api.hashicorp.cloud",
        }).toString(),
      });

      if (!response.ok) throw new Error("Failed to authenticate with HCP");

      const json = await response.json() as any;
      this.token = json.access_token;
      this.orgId = process.env.HCP_ORG_ID;
      this.projectId = process.env.HCP_PROJECT_ID;
      this.appId = process.env.HCP_APP_NAME;

      ConsoleUtils.success("Authenticated with HCP successfully");
    } else {
      this.mode = "vault";
      const ok = await ensurePackageInstalled("node-vault");
      if (!ok) return;

      const vars = await ensureVariables({ VAULT_ADDR: undefined, VAULT_TOKEN: undefined });
      const { default: vault } = await import("node-vault");
      this.vaultClient = vault({ endpoint: vars.VAULT_ADDR, token: vars.VAULT_TOKEN });
      ConsoleUtils.debug("Vault client initialized");
    }
  }


  async getSecret(key: string): Promise<string | undefined> {
    await this.initialized;

    if (this.mode === "vault") {
      try {
        const response = await this.vaultClient.read(`secret/data/${key}`);
        return response?.data?.data?.value;
      } catch (error) {
        ConsoleUtils.warn(`Secret not found in Vault: ${key}`);
        return undefined;
      }
    } else {
      const url = `https://api.cloud.hashicorp.com/secrets/2023-11-28/organizations/${this.orgId}/projects/${this.projectId}/apps/${this.appId}/secrets/${key}:open`;
      const res = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!res.ok) {
        ConsoleUtils.warn(`Secret not found in HCP: ${key}`);
        return undefined;
      }
      const json = await res.json() as any;
      return json.secret?.static_version?.value;
    }
  }

  getSecretSync(): string | undefined {
    ConsoleUtils.error("HCP Secrets and Vault do not support synchronous retrieval.");
    return undefined;
  }

  async pushSecrets(secrets: Record<string, string>): Promise<boolean | undefined> {
    const { provider } = await inquirer.prompt([
      {
        type: "list",
        name: "provider",
        message: "Where do you want to push your secrets?",
        choices: [
          { name: "Self-hosted Vault (VAULT_ADDR + VAULT_TOKEN)", value: "vault" },
          { name: "HashiCorp Cloud (HCP_CLIENT_ID + HCP_CLIENT_SECRET)", value: "hcp" },
        ],
      },
    ]);
  
    if (provider === "vault") {
      const ok = await ensurePackageInstalled("node-vault");
      if (!ok) return false;
  
      const vars = await ensureVariables({
        VAULT_ADDR: undefined,
        VAULT_TOKEN: undefined,
      });
  
      process.env.VAULT_ADDR = vars.VAULT_ADDR;
      process.env.VAULT_TOKEN = vars.VAULT_TOKEN;
    } else {
      const vars = await ensureVariables({
        HCP_CLIENT_ID: undefined,
        HCP_CLIENT_SECRET: undefined,
        HCP_ORG_ID: undefined,
        HCP_PROJECT_ID: undefined,
        HCP_APP_NAME: undefined,
      });
  
      process.env.HCP_CLIENT_ID = vars.HCP_CLIENT_ID;
      process.env.HCP_CLIENT_SECRET = vars.HCP_CLIENT_SECRET;
      process.env.HCP_ORG_ID = vars.HCP_ORG_ID;
      process.env.HCP_PROJECT_ID = vars.HCP_PROJECT_ID;
      process.env.HCP_APP_NAME = vars.HCP_APP_NAME;
    }
  
    this.initialized = this.initializeClient();
    await this.initialized;
    if (!this.token && !this.vaultClient) {
      ConsoleUtils.error("HashiCorp plugin not initialized correctly.");
      return false;
    }
  
    secrets = await filterSecretsWithExclusions({
      secrets,
      excludeKeys: [
        "VAULT_ADDR",
        "VAULT_TOKEN",
        "HCP_CLIENT_ID",
        "HCP_CLIENT_SECRET",
        "HCP_ORG_ID",
        "HCP_PROJECT_ID",
        "HCP_APP_NAME",
        "DOTSECRETS_PLUGIN",
      ],
      promptMessage: "Heads up! You’re uploading your environment variables to Vault, and we noticed:\n\nKEYS\n\nThese [are/is] in the list and seem intended for local use. Exclude them?",
    });
  
    const entries = Object.entries(secrets);
    const multi = new cliProgress.MultiBar(
      {
        format: "[{bar}] {percentage}% | {value}/{total} secrets",
        clearOnComplete: true,
        hideCursor: true,
      },
      cliProgress.Presets.shades_classic
    );
  
    const bar = multi.create(entries.length, 0);
    bar.start(entries.length, 0);
    const limit = pLimit(5);
    const failed: string[] = [];

    let successCount = 0;

    const parsedEntries = entries.map(([key, value]) => [this.parseSecretName(key), value]);

    await Promise.all(
      parsedEntries.map(([key, value]) =>
        limit(async () => {
          try {  
            if (this.mode === "vault") {
              await this.vaultClient!.write(`secret/data/${key}`, { data: { value } });
            } else {
              const url = `https://api.cloud.hashicorp.com/secrets/2023-11-28/organizations/${process.env.HCP_ORG_ID}/projects/${process.env.HCP_PROJECT_ID}/apps/${process.env.HCP_APP_NAME}/secret/kv`;
  
              const res = await fetch(url, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${this.token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ name: key, value }),
              });
  
              if (res.status === 401) {
                ConsoleUtils.error("HCP authentication failed. Please check your HCP_CLIENT_ID and HCP_CLIENT_SECRET.");
                throw new Error("Unauthorized (401)");
              }
  
              if (res.status === 403) {
                ConsoleUtils.error(`Your token is valid, but you don't have permission to write secrets to this app.`);
                ConsoleUtils.info(
                  "Go to your app in HCP → Access Control → Role Assignment → select your app → Edit → and assign the role 'Vault Secrets App Manager'.", true
                );
                throw new Error("Forbidden (403)");
              }
  
              if (!res.ok) {
                const body = await res.text();
                throw new Error(`HCP push failed: ${res.status} ${res.statusText} — ${body}`);
              }
            }
  
            successCount++;
          } catch (error) {
            failed.push(key);
          } finally {
            bar.increment();
          }
        })
      )
    );
  
    bar.stop();
    multi.stop();
    failed.forEach(key => ConsoleUtils.error(`${key} failed to push.`));
    failed.forEach(key => ConsoleUtils.error(`${key} failed to push.`));

    if (successCount === entries.length) ConsoleUtils.success("All secrets pushed!");
    else ConsoleUtils.warn(`${successCount}/${entries.length} pushed successfully.`);
    return successCount > 0;
  }

  async setup(): Promise<boolean | undefined> {
    console.log(boxen(chalk.cyanBright("Setting up HashiCorp Plugin..."), { padding: 1, borderColor: "cyan", borderStyle: "round" }));
  
    const { provider } = await inquirer.prompt([
      {
        type: "list",
        name: "provider",
        message: "Where is your Vault instance hosted?",
        choices: [
          { name: "Self-hosted Vault (VAULT_ADDR + VAULT_TOKEN)", value: "vault" },
          { name: "HashiCorp Cloud (HCP_CLIENT_ID + HCP_CLIENT_SECRET)", value: "hcp" },
        ],
      },
    ]);
  
    let env;
    if (provider === "vault") {
      const ok = await ensurePackageInstalled("node-vault", true);
      if (!ok) return false;
  
      env = await ensureAndPersistEnvVars("VAULT_ADDR", "VAULT_TOKEN");
    } else {
      env = await ensureAndPersistEnvVars(
        "HCP_CLIENT_ID",
        "HCP_CLIENT_SECRET",
        "HCP_ORG_ID",
        "HCP_PROJECT_ID",
        "HCP_APP_NAME"
      );
    }
  
    if (process.env.DOTSECRETS_PLUGIN === "hashicorp") {
      ConsoleUtils.success(`DOTSECRETS_PLUGIN already set to ${"hashicorp"}.`);
    } else {
      ConsoleUtils.info(`Setting DOTSECRETS_PLUGIN=${"hashicorp"}...`, true);
      await forceSetVars({ DOTSECRETS_PLUGIN: "hashicorp" });
    }
  
    const reminderVars = provider === "vault"
      ? `VAULT_ADDR=${env.VAULT_ADDR}\n   VAULT_TOKEN=***`
      : `HCP_CLIENT_ID=${env.HCP_CLIENT_ID}\n   HCP_CLIENT_SECRET=***\n   HCP_ORG_ID=${env.HCP_ORG_ID}\n   HCP_PROJECT_ID=${env.HCP_PROJECT_ID}\n   HCP_APP_NAME=${env.HCP_APP_NAME}`;
  
    console.log(
      boxen(
        chalk.blueBright(
          `Reminder 🔐 In production you should set:\n\n   DOTSECRETS_PLUGIN=${"hashicorp"}\n   ${reminderVars}\n\nDirectly in your environment or CI/CD pipeline.`
        ),
        { padding: 1, borderColor: "blueBright", borderStyle: "round" }
      )
    );
  
    return true;
  }
}