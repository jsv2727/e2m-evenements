import { NextResponse } from 'next/server';
import { anthropic, getBestModel, SYSTEM_PROMPTS } from '@/lib/anthropic';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const body = await req.json();
  const { contractId, content } = body;

  const model = await getBestModel();

  const prompt = `Analyse ce contrat en tant qu'expert juridique québécois. Fournis:

1. **Résumé** (2-3 phrases)
2. **Points forts** (ce qui est bien couvert)
3. **Risques et lacunes identifiés** (clauses manquantes, ambiguïtés, risques légaux)
4. **Recommandations** (modifications suggérées)
5. **Score de risque** (1-10 où 1=très sécuritaire, 10=très risqué) — indique UNIQUEMENT le chiffre à la fin dans ce format: SCORE: X

Contrat à analyser:
---
${content}
---`;

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 2048,
      system: SYSTEM_PROMPTS.legal,
      messages: [{ role: 'user', content: prompt }],
    });

    const review = response.content[0].type === 'text' ? response.content[0].text : '';

    // Extract risk score
    const scoreMatch = review.match(/SCORE:\s*(\d+)/i);
    const riskScore = scoreMatch ? parseInt(scoreMatch[1]) : null;
    const cleanReview = review.replace(/SCORE:\s*\d+/i, '').trim();

    if (contractId) {
      await db.contract.update({
        where: { id: contractId },
        data: { aiReview: cleanReview, riskScore },
      });
    }

    return NextResponse.json({ review: cleanReview, riskScore });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
