import Anthropic from "@anthropic-ai/sdk";
import type { Activity, GeneratedPosts, GenerateOptions } from "./types.js";

const MODEL = "claude-opus-4-8";

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    x_thread: {
      type: "array",
      items: { type: "string" },
      description:
        "Thread X (Twitter) : 3 à 6 tweets. Chaque tweet fait moins de 280 caractères. Le premier est le hook.",
    },
    linkedin: {
      type: "string",
      description:
        "Post LinkedIn complet, narratif, avec des sauts de ligne entre les paragraphes courts.",
    },
    reddit: {
      type: "object",
      properties: {
        title: { type: "string", description: "Titre du post Reddit." },
        body: { type: "string", description: "Corps du post Reddit en markdown." },
      },
      required: ["title", "body"],
      additionalProperties: false,
    },
  },
  required: ["x_thread", "linkedin", "reddit"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `Tu es le ghostwriter d'un solopreneur qui construit son SaaS en public ("build in public", dans l'esprit de Marc Lou / levelsio).

Ta mission : transformer une liste brute de commits GitHub et de tâches Notion en une histoire courte et engageante. Le lecteur n'est pas développeur : traduis le jargon technique en bénéfices concrets et en émotions (galères, petites victoires, leçons apprises).

Principes de storytelling :
- Ouvre avec un hook : une tension, un chiffre, une confession — jamais "cette semaine j'ai travaillé sur…".
- Montre les coulisses honnêtement : ce qui a cassé, ce qui a pris trois fois plus de temps que prévu.
- Regroupe les commits en 2-3 accomplissements lisibles plutôt que de les lister.
- Termine par une ouverture : une question à l'audience ou le prochain objectif.
- Zéro langue de bois marketing, zéro superlatif creux, pas de spam de hashtags (un seul #buildinpublic max, sur X uniquement).

Tons par plateforme :
- X : punchy, phrases courtes, un tweet = une idée. Le premier tweet doit donner envie de dérouler le thread.
- LinkedIn : narratif à la première personne, paragraphes d'une ou deux phrases, une leçon métier en fil rouge.
- Reddit (r/SaaS, r/indiehackers) : authentique et détaillé, aucun ton promotionnel — un builder qui partage, pas une marque qui vend. Le titre est factuel et intriguant.`;

/**
 * Transforme l'activité de développement en posts prêts à publier,
 * via l'API Claude (sortie structurée JSON).
 */
export async function generatePosts(
  activity: Activity,
  opts: GenerateOptions,
): Promise<GeneratedPosts> {
  const client = new Anthropic();

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: SYSTEM_PROMPT,
    output_config: {
      format: { type: "json_schema", schema: OUTPUT_SCHEMA },
    },
    messages: [{ role: "user", content: buildUserPrompt(activity, opts) }],
  });

  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") {
    throw new Error(
      "La génération a été refusée par le modèle. Réessayez avec un contexte produit différent.",
    );
  }
  if (message.stop_reason === "max_tokens") {
    throw new Error(
      "Réponse tronquée (max_tokens atteint). Réduisez la période analysée ou relancez.",
    );
  }

  const text = message.content.find((b) => b.type === "text")?.text ?? "";
  return JSON.parse(text) as GeneratedPosts;
}

function buildUserPrompt(activity: Activity, opts: GenerateOptions): string {
  const lang = opts.lang === "fr" ? "français" : "anglais";
  const commitLines = activity.commits
    .map((c) => `- ${c.date.slice(0, 10)} ${c.sha} ${c.message}`)
    .join("\n");
  const taskLines = activity.notionTasks
    .map((t) => `- ${t.completedAt.slice(0, 10)} ${t.title}`)
    .join("\n");

  return `Projet : ${activity.projectName} (dépôt ${activity.repo})
Période : du ${activity.since.slice(0, 10)} au ${activity.until.slice(0, 10)}
Langue des posts : ${lang}
${opts.productContext ? `Contexte produit : ${opts.productContext}\n` : ""}
Commits GitHub (${activity.commits.length}) :
${commitLines || "(aucun)"}

Tâches Notion terminées (${activity.notionTasks.length}) :
${taskLines || "(aucune)"}

Rédige les posts pour X, LinkedIn et Reddit à partir de cette activité. Un graphique de progression (commits par jour) sera joint aux posts : tu peux y faire référence ("le graphique ci-dessous") sans le décrire en détail.`;
}

/**
 * Traduit les erreurs de l'API en messages actionnables pour le CLI.
 */
export function explainApiError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) {
    return "Clé API invalide. Vérifiez ANTHROPIC_API_KEY dans votre .env.";
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "Rate limit Anthropic atteinte. Patientez une minute puis relancez.";
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return "Impossible de joindre l'API Anthropic. Vérifiez votre connexion réseau.";
  }
  if (error instanceof Anthropic.APIError) {
    return `Erreur API Anthropic (${error.status ?? "?"}) : ${error.message}`;
  }
  return error instanceof Error ? error.message : String(error);
}
