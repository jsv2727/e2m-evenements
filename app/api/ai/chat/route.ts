import { NextResponse } from 'next/server';
import { anthropic, getBestModel, SYSTEM_PROMPTS } from '@/lib/anthropic';
import { db } from '@/lib/db';

export async function GET() {
  const conversations = await db.aiConversation.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 20,
    select: { id: true, title: true, module: true, messages: true, model: true, updatedAt: true },
  });
  return NextResponse.json(conversations);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { module = 'general', messages, conversationId } = body;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      content: '⚠️ Clé API Anthropic manquante. Ajoutez votre clé ANTHROPIC_API_KEY dans le fichier .env puis redémarrez le serveur.\n\nObtenez votre clé sur console.anthropic.com',
    });
  }

  const model = await getBestModel();
  const systemPrompt = SYSTEM_PROMPTS[module as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS.general;

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';

    // Save or update conversation
    const title = messages[0]?.content?.slice(0, 60) + '...' || 'Conversation';
    let savedConv;

    if (conversationId) {
      savedConv = await db.aiConversation.update({
        where: { id: conversationId },
        data: {
          messages: JSON.stringify([...messages, { role: 'assistant', content }]),
          model,
        },
      });
    } else {
      savedConv = await db.aiConversation.create({
        data: {
          module,
          title,
          messages: JSON.stringify([...messages, { role: 'assistant', content }]),
          model,
        },
      });
    }

    return NextResponse.json({ content, conversationId: savedConv.id, model });
  } catch (error: any) {
    const msg = error.status === 401
      ? '❌ Clé API invalide. Vérifiez votre ANTHROPIC_API_KEY dans le fichier .env'
      : `❌ Erreur: ${error.message}`;
    return NextResponse.json({ content: msg }, { status: 200 });
  }
}
