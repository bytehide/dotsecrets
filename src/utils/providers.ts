export type Provider =
  | "azure"
  | "bytehide"
  | "aws"
  | "gcp"
  | "ibm"
  | "doppler"
  | "cyberark"
  | "akeyless"
  | "hashicorp"
  | "keeper"
  | "onepassword"
  | "env";

export const providerMap: Record<string, Provider> = {
    "AWS Secrets Manager": "aws",
    "ByteHide Secrets": "bytehide",
    "Azure Key Vault": "azure",
    "Local Secrets": "env",
    "HashiCorp Vault" : "hashicorp",
    "1Password" : "onepassword",
    "Google Cloud Secret Manager": "gcp",
    "IBM Secrets Manager": "ibm",
    "Keeper Secrets Manager": "keeper",
    "Doppler Secrets Manager": "doppler"
  };

const validators: Record<Provider, RegExp> = {
  azure: /^[0-9A-Za-z]([0-9A-Za-z-]{0,125}[0-9A-Za-z])?$/,
  bytehide: /^[0-9A-Za-z]([0-9A-Za-z-]{0,125}[0-9A-Za-z])?$/,
  aws: /^([A-Za-z0-9_+=.@-]){1,512}$/,
  gcp: /^[A-Za-z0-9_-]{1,255}$/,
  ibm: /^[A-Za-z0-9][A-Za-z0-9_.-]{0,254}[A-Za-z0-9]$/,
  doppler: /^[A-Z][A-Z0-9_]*$/,
  cyberark: /^[A-Za-z0-9]{1,28}$/,
  akeyless: /^.+$/,       // permite cualquier ruta
  hashicorp: /^[A-Za-z0-9][A-Za-z0-9\-\/]*[A-Za-z0-9]$/,
  keeper: /^.+$/,        // no restricciones
  onepassword: /^.+$/,   // no restricciones
  env: /^[A-Za-z_][A-Za-z0-9_]*$/, // formato env var
};

export function validateSecretName(provider: Provider, name: string): boolean {
  const regex = validators[provider];
  return regex.test(name);
}

export function normalizeSecretName(provider: Provider, key: string): string {
  let base = key.trim();

  switch (provider) {
    case "env":
      return base.toUpperCase();

    case "doppler":
      return base
        .toUpperCase()
        .replace(/[^A-Z0-9_]/g, "_")
        .replace(/(^[^A-Z]|[^A-Z0-9_]$)+/g, "");

    case "aws":
      return base
        .toLowerCase()
        .replace(/[^A-Za-z0-9_+=.@-]/g, "")
        .replace(/-/g, "_");

    case "gcp":
      return base
        .replace(/[^A-Za-z0-9_-]/g, "") // conserva mayúsculas y símbolos válidos
        .slice(0, 255); // asegúrate de que no supere 255 caracteres

    case "azure":
    case "bytehide":
      return base
        .toLowerCase()
        .replace(/[_\s]+/g, "-")      // snake_case or spaces → kebab
        .replace(/[^a-z0-9-]/g, "")   // elimina todo lo no permitido
        .replace(/-+/g, "-")          // colapsa guiones repetidos
        .replace(/^-+|-+$/g, "");     // quita guiones al inicio/fin

    case "ibm":
      return base
        .toLowerCase()
        .replace(/[^a-z0-9_.-]/g, "")
        .replace(/^[-._]+|[-._]+$/g, "");

    case "hashicorp":
      return base
        .toLowerCase()
        .replace(/[^a-z0-9\-\/]/g, "")
        .replace(/^[-\/]+|[-\/]+$/g, "");

    case "akeyless":
      return base.replace(/[^A-Za-z0-9\-\/]/g, "");

    case "cyberark":
      return base.replace(/[^A-Za-z0-9]/g, "").slice(0, 28);

    case "keeper":
    case "onepassword":
      return base;

    default:
      return base;
  }
}