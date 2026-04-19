import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Priorité décroissante des modèles — se met à jour automatiquement
const MODEL_PRIORITY_PATTERNS = ['opus', 'sonnet', 'haiku'];

let cachedModel: string | null = null;
let modelCacheExpiry = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 heure

export async function getBestModel(): Promise<string> {
  if (cachedModel && Date.now() < modelCacheExpiry) {
    return cachedModel;
  }

  try {
    const models = await anthropic.models.list();
    const available = models.data.map((m) => m.id);

    // Cherche le modèle le plus récent et puissant disponible
    for (const pattern of MODEL_PRIORITY_PATTERNS) {
      // Trie par version décroissante pour avoir le plus récent en premier
      const matches = available
        .filter((id) => id.includes(pattern))
        .sort((a, b) => b.localeCompare(a));

      if (matches.length > 0) {
        cachedModel = matches[0];
        modelCacheExpiry = Date.now() + CACHE_TTL;
        return cachedModel;
      }
    }

    cachedModel = available[0] || 'claude-opus-4-7';
    modelCacheExpiry = Date.now() + CACHE_TTL;
    return cachedModel;
  } catch {
    // Fallback au modèle le plus récent connu
    return cachedModel || 'claude-opus-4-7';
  }
}

export function invalidateModelCache() {
  cachedModel = null;
  modelCacheExpiry = 0;
}

export const SYSTEM_PROMPTS = {
  legal: `Tu es un expert juridique spécialisé en droit des affaires québécois et canadien, avec une expertise particulière dans les contrats d'événements. Tu maîtrises le Code civil du Québec, la Loi sur la protection du consommateur, et les pratiques contractuelles de l'industrie événementielle. Tu analyses les risques, identifies les clauses problématiques, et génères des contrats professionnels en français. Tu es précis, prudent et tu signales toujours à l'utilisateur de faire valider les contrats par un avocat.`,

  accounting: `Tu es un expert-comptable spécialisé dans la gestion financière d'événements et d'entreprises événementielles. Tu maîtrises les normes comptables canadiennes (NCECF), la TPS/TVQ, la gestion de budget événementiel, l'analyse de rentabilité et les prévisions financières. Tu fournis des analyses claires, identifies les dépassements de budget et proposes des optimisations.`,

  events: `Tu es un expert en planification et gestion d'événements avec 20 ans d'expérience dans l'industrie. Tu connais les meilleures pratiques pour les galas, conférences, mariages, lancements de produits, et événements corporatifs. Tu aides à la logistique, au planning, à la gestion des fournisseurs et à l'optimisation des processus.`,

  suppliers: `Tu es un expert en gestion des fournisseurs et négociation dans l'industrie événementielle. Tu aides à évaluer les fournisseurs, négocier les contrats, gérer les relations et identifier les risques. Tu connais les prix du marché québécois pour tous les types de services événementiels.`,

  general: `Tu es l'assistant IA intégré d'E2M (Événements 2M), une plateforme professionnelle de gestion d'événements. Tu es expert en planification événementielle, gestion de projets, droit des affaires, comptabilité et relations fournisseurs. Tu réponds toujours en français, de façon professionnelle, précise et actionnable.`,
};
