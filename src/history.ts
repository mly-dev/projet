import fs from "node:fs";
import path from "node:path";

interface HistoryEntry {
  date: string; // AAAA-MM-JJ
  hook: string; // premier tweet du thread généré
}

const HISTORY_FILE = "history.json";
const MAX_ENTRIES = 20;
const RECENT_HOOKS = 5;

/**
 * Retourne les derniers hooks générés, pour que l'IA évite de répéter les
 * mêmes angles d'une semaine sur l'autre.
 */
export function loadRecentHooks(outDir: string): string[] {
  const file = path.join(outDir, HISTORY_FILE);
  if (!fs.existsSync(file)) return [];
  try {
    const entries = JSON.parse(fs.readFileSync(file, "utf8")) as HistoryEntry[];
    return entries.slice(-RECENT_HOOKS).map((e) => e.hook);
  } catch {
    // Historique corrompu : on repart de zéro plutôt que de bloquer.
    return [];
  }
}

/** Enregistre le hook du jour dans l'historique (borné à MAX_ENTRIES). */
export function appendHook(outDir: string, hook: string): void {
  if (!hook) return;
  const file = path.join(outDir, HISTORY_FILE);
  let entries: HistoryEntry[] = [];
  if (fs.existsSync(file)) {
    try {
      entries = JSON.parse(fs.readFileSync(file, "utf8")) as HistoryEntry[];
    } catch {
      entries = [];
    }
  }
  entries.push({ date: new Date().toISOString().slice(0, 10), hook });
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(entries.slice(-MAX_ENTRIES), null, 2), "utf8");
}
