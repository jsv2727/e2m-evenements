import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { NotFoundError } from './task-service';

/** Traduit les erreurs connues en réponses HTTP cohérentes. */
export function apiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: 'Données invalides', issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) },
      { status: 400 },
    );
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') return NextResponse.json({ error: 'Ressource introuvable' }, { status: 404 });
    if (error.code === 'P2002') return NextResponse.json({ error: 'Ce nom existe déjà' }, { status: 409 });
    if (error.code === 'P2003') return NextResponse.json({ error: 'Référence invalide' }, { status: 400 });
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }
  console.error(error);
  return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
}
