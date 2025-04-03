import chalk from "chalk";

export class ConsoleUtils {
  private static prefix = chalk.cyan("[dotsecrets]");
  private static debugEnabled = false;

  static setDebug(enabled: boolean) {
    this.debugEnabled = enabled;
  }

  static log(message: string) {
    console.log(`${this.prefix} ${chalk.white(message)}`);
  }

  static info(message: string, force: boolean = false) {
    if (this.debugEnabled || force)
      console.log(`${this.prefix} ${chalk.blue(message)}`);
  }

  static warn(message: string, force: boolean = false) {
    if (this.debugEnabled || force)
      console.warn(`${this.prefix} ${chalk.yellow("⚠️ " + message)}`);
  }

  static error(message: string, throwError: boolean = false) {
    console.error(`${this.prefix} ${chalk.red("❌ " + message)}`);
    if(throwError){
      throw new Error(message);
    }
  }

  static success(message: string) {
    console.log(`${this.prefix} ${chalk.green("✅ " + message)}`);
  }

  static debug(message: string) {
    if (this.debugEnabled)
      console.log(`${this.prefix} ${chalk.magenta("[DEBUG] " + message)}`);
  }
  /**
 * Makes a command or text visually clickable in supported terminals.
 * @param text - The text to format.
 * @returns Formatted string with clickable styling.
 */
  static clickable(text: string): string {
    return chalk.blueBright.underline(text);
  }
}