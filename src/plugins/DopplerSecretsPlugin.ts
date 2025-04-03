import { ISecretsPlugin } from "./ISecretsPlugin.js";
import chalk from "chalk";
import boxen from "boxen";
import { ConsoleUtils } from "../utils/console.js";
import { getInstallCommand } from "../utils/manager.js";
import { BaseSecretsPlugin } from "./BaseSecretsPlugin.js";
import {
  ensureAndPersistEnvVars,
  ensurePackageInstalled,
  ensureVariables,
  filterSecretsWithExclusions,
  forceSetVars,
} from "../cli/utils.js";
import cliProgress from "cli-progress";

export class DopplerSecretsManagerPlugin extends BaseSecretsPlugin implements ISecretsPlugin {
  pluginName = "Doppler Secrets Manager";
  private client?: any;
  private initialized?: Promise<void>;

  constructor(_: Record<string, unknown> = {}, skip = false) {
    super();
    if (!skip) this.initialized = this.initializeClient();
  }

  private async initializeClient(): Promise<void> {
    let DopplerSDK: any;
  
    try {
      // Intentamos importar el SDK de Doppler
      ({ default: DopplerSDK } = await import("@dopplerhq/node-sdk"));
    } catch (sdkError) {
      ConsoleUtils.error(
        `Doppler SDK not installed. Run: ${ConsoleUtils.clickable(getInstallCommand("@dopplerhq/node-sdk"))} or better ${ConsoleUtils.clickable("npx dotsecrets setup")}`
      );
      throw sdkError;
    }
  
    try {
      const token = process.env.DOPPLER_TOKEN;
      if (!token) {
        throw new Error("DOPPLER_TOKEN is missing");
      }
  
      this.client = new DopplerSDK({ accessToken: token });
      ConsoleUtils.debug("Doppler Secrets Manager plugin initialized successfully.");
    } catch (initError) {
      ConsoleUtils.error(`Failed to initialize Doppler SDK client: ${initError}`);
      throw initError;
    }
  }

  async getSecret(key: string): Promise<string | undefined> {
    await this.initialized;
    key = this.parseSecretName(key);

    try {
      const project = process.env.DOPPLER_PROJECT;
      const config = process.env.DOPPLER_CONFIG;
      if (!project || !config) throw new Error("DOPPLER_PROJECT or DOPPLER_CONFIG is missing");

      const result = await this.client!.secrets.get(project, config, key);
      return result.value?.raw;
    } catch (error) {
      ConsoleUtils.warn(`Secret \"${key}\" not found or error retrieving: ${error}`);
      return undefined;
    }
  }

  getSecretSync(): string | undefined {
    ConsoleUtils.error("Doppler Secrets Manager does not support synchronous retrieval.");
    return undefined;
  }

  async pushSecrets(secrets: Record<string, string>): Promise<boolean | undefined> {
    const vars = await ensureVariables({ 
      DOPPLER_TOKEN: undefined, 
      DOPPLER_PROJECT: undefined, 
      DOPPLER_CONFIG: undefined 
    });
    process.env = { ...process.env, ...vars };
  
    // Verificar que tenemos las variables de entorno necesarias
    if (!process.env.DOPPLER_TOKEN || !process.env.DOPPLER_PROJECT || !process.env.DOPPLER_CONFIG) {
      ConsoleUtils.error("Missing Doppler credentials. Please set DOPPLER_TOKEN, DOPPLER_PROJECT, and DOPPLER_CONFIG.");
      return false;
    }
  
    secrets = await filterSecretsWithExclusions({
      secrets,
      excludeKeys: ["DOPPLER_TOKEN", "DOPPLER_PROJECT", "DOPPLER_CONFIG", "DOTSECRETS_PLUGIN"],
      promptMessage:
        "Heads up! You're uploading your environment variables to Doppler, and we noticed:\n\nKEYS\n\nThese [are/is] in the list and seem intended for local use. Exclude them?",
    });
  
    // No hay secretos para subir después de filtrar
    if (Object.keys(secrets).length === 0) {
      ConsoleUtils.warn("No secrets to push after filtering.");
      return false;
    }
  
    const bar = new cliProgress.SingleBar({
      format: '[{bar}] {percentage}% | Pushing secrets to Doppler',
      clearOnComplete: true,
      hideCursor: true,
    }, cliProgress.Presets.shades_classic);
    
    bar.start(100, 0);
    bar.update(25); // Actualizar al 25% para mostrar progreso al usuario
  
    try {
      // Enviar todos los secretos en una sola solicitud (batch)
      const response = await fetch(`https://api.doppler.com/v3/configs/config/secrets`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(process.env.DOPPLER_TOKEN + ':').toString('base64'),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project: process.env.DOPPLER_PROJECT,
          config: process.env.DOPPLER_CONFIG,
          secrets: secrets
        })
      });
  
      bar.update(75); // Actualizar al 75% después de enviar la solicitud
  
      if (!response.ok) {
        const errorData = await response.json();
        bar.stop();
        ConsoleUtils.error(`Doppler API error: ${errorData.messages?.[0] || response.statusText}`);
        return false;
      }
  
      const result = await response.json();
      bar.update(100);
      bar.stop();
  
      // Verificar si hubo éxito completo o parcial
      const keysToUpload = Object.keys(secrets);
      const totalSecrets = keysToUpload.length;

      // Verificar cuántos de nuestros secretos están en la respuesta
      const successfulKeys = keysToUpload.filter(key => result.secrets && key in result.secrets);
      const successCount = successfulKeys.length;
      
      if (successCount === totalSecrets) {
        ConsoleUtils.success(`All ${totalSecrets} secrets pushed successfully!`);
        return true;
      } else {
        ConsoleUtils.warn(`${successCount}/${totalSecrets} secrets pushed successfully.`, true);
        
        // Mostrar qué secretos no se pudieron subir
        const successfulKeys = new Set(Object.keys(result.secrets || {}));
        const failedKeys = Object.keys(secrets).filter(key => !successfulKeys.has(key));
        failedKeys.forEach(key => ConsoleUtils.error(`${key} failed to push.`));
        
        return successCount > 0;
      }
    } catch (error) {
      bar.stop();
      ConsoleUtils.error(`Failed to push secrets: ${(error as any).message}`);
      return false;
    }
  }

  async setup(): Promise<boolean | undefined> {
    console.log(
      boxen(chalk.cyanBright("Setting up Doppler Secrets Manager Plugin..."), {
        padding: 1,
        borderColor: "cyan",
        borderStyle: "round",
      })
    );

    const ok = await ensurePackageInstalled("@dopplerhq/node-sdk", true);
    if (!ok) return false;

    const env = await ensureAndPersistEnvVars("DOPPLER_TOKEN", "DOPPLER_PROJECT", "DOPPLER_CONFIG");

    if (process.env.DOTSECRETS_PLUGIN === "doppler") {
      ConsoleUtils.success("DOTSECRETS_PLUGIN already set to doppler.");
    } else {
      ConsoleUtils.info("Setting DOTSECRETS_PLUGIN=doppler...", true);
      await forceSetVars({ DOTSECRETS_PLUGIN: "doppler" });
    }

    console.log(
      boxen(
        chalk.blueBright(
          `Reminder 🔐 In production you should set:\n\n   DOTSECRETS_PLUGIN=doppler\n   DOPPLER_TOKEN=${env.DOPPLER_TOKEN}\n   DOPPLER_PROJECT=${env.DOPPLER_PROJECT}\n   DOPPLER_CONFIG=${env.DOPPLER_CONFIG}\n\nDirectly in your environment or CI/CD pipeline.`
        ),
        { padding: 1, borderColor: "blueBright", borderStyle: "round" }
      )
    );

    return true;
  }
}
