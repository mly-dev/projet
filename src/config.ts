import fs from "node:fs";
import path from "node:path";

/**
 * Charge un fichier .env (s'il existe) dans process.env sans dépendance
 * externe. Les variables déjà présentes dans l'environnement gagnent.
 */
export function loadDotEnv(cwd: string = process.cwd()): void {
  const envPath = path.join(cwd, ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Retire les guillemets englobants éventuels
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

export interface Config {
  githubToken?: string;
  githubRepo?: string;
  notionToken?: string;
  notionDatabaseId?: string;
  notionStatusProperty: string;
  notionDoneValue: string;
}

export function readConfig(): Config {
  return {
    githubToken: process.env.GITHUB_TOKEN,
    githubRepo: process.env.GITHUB_REPO,
    notionToken: process.env.NOTION_TOKEN,
    notionDatabaseId: process.env.NOTION_DATABASE_ID,
    notionStatusProperty: process.env.NOTION_STATUS_PROPERTY ?? "Status",
    notionDoneValue: process.env.NOTION_DONE_VALUE ?? "Done",
  };
}
