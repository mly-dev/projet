import type { NotionTask } from "../types.js";

interface NotionQueryResult {
  results: Array<{
    last_edited_time: string;
    properties: Record<string, NotionProperty>;
  }>;
  has_more: boolean;
  next_cursor: string | null;
}

interface NotionProperty {
  type: string;
  title?: Array<{ plain_text: string }>;
  status?: { name: string } | null;
  select?: { name: string } | null;
  checkbox?: boolean;
}

/**
 * Récupère les tâches marquées "terminées" dans une base Notion depuis une
 * date donnée. La propriété de statut est configurable (status, select ou
 * checkbox). Retourne [] si Notion n'est pas configuré — la source est
 * optionnelle.
 */
export async function fetchCompletedTasks(
  since: Date,
  opts: {
    token?: string;
    databaseId?: string;
    statusProperty: string;
    doneValue: string;
  },
): Promise<NotionTask[]> {
  if (!opts.token || !opts.databaseId) return [];

  const res = await fetch(
    `https://api.notion.com/v1/databases/${opts.databaseId}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter: {
          and: [
            {
              timestamp: "last_edited_time",
              last_edited_time: { on_or_after: since.toISOString() },
            },
          ],
        },
        page_size: 100,
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Erreur Notion API (${res.status}) : ${await res.text()}`);
  }

  const data = (await res.json()) as NotionQueryResult;
  const tasks: NotionTask[] = [];

  for (const page of data.results) {
    const statusProp = page.properties[opts.statusProperty];
    if (!isDone(statusProp, opts.doneValue)) continue;

    const titleProp = Object.values(page.properties).find(
      (p) => p.type === "title",
    );
    const title = titleProp?.title?.map((t) => t.plain_text).join("") ?? "";
    if (!title) continue;

    tasks.push({ title, completedAt: page.last_edited_time });
  }

  return tasks;
}

function isDone(prop: NotionProperty | undefined, doneValue: string): boolean {
  if (!prop) return false;
  switch (prop.type) {
    case "status":
      return prop.status?.name === doneValue;
    case "select":
      return prop.select?.name === doneValue;
    case "checkbox":
      return prop.checkbox === true;
    default:
      return false;
  }
}
