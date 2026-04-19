import { NextResponse } from 'next/server';
import { anthropic, getBestModel, SYSTEM_PROMPTS } from '@/lib/anthropic';
import { db } from '@/lib/db';

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  SERVICE: 'Contrat de services', VENUE: 'Contrat de location de salle',
  NDA: 'Accord de confidentialité (NDA)', CATERING: 'Contrat de services traiteur',
  AV: 'Contrat de services audiovisuels', EMPLOYMENT: 'Contrat d\'emploi',
  PARTNERSHIP: 'Accord de partenariat', AUTRE: 'Contrat général',
};

export async function POST(req: Request) {
  const body = await req.json();
  const { type, partyA, partyB, eventDescription, value, specificTerms } = body;

  const model = await getBestModel();

  const prompt = `Génère un ${CONTRACT_TYPE_LABELS[type] || type} professionnel et complet selon le droit québécois avec les informations suivantes:

- Partie A: ${partyA || 'À définir'}
- Partie B: ${partyB || 'À définir'}
- Valeur: ${value ? `${value} $ CAD` : 'À définir'}
- Contexte: ${eventDescription || 'Événement professionnel'}
${specificTerms ? `- Conditions particulières: ${specificTerms}` : ''}

Le contrat doit être:
1. Professionnel et juridiquement solide selon le Code civil du Québec
2. Inclure: objet, obligations des parties, paiement, responsabilités, résiliation, confidentialité, force majeure, juridiction (Québec)
3. Rédigé en français formel
4. Prêt à être signé (sections pour signatures)
5. Adapté à l'industrie événementielle québécoise

Génère UNIQUEMENT le contrat, sans commentaires avant ou après.`;

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      system: SYSTEM_PROMPTS.legal,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';

    const title = `${CONTRACT_TYPE_LABELS[type] || type}${partyB ? ` — ${partyB}` : ''}`;
    const contract = await db.contract.create({
      data: {
        title,
        content,
        type,
        status: 'DRAFT',
        partyA,
        partyB,
        value: value ? parseFloat(value) : null,
      },
    });

    return NextResponse.json({ id: contract.id, content });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
