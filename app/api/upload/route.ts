import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'contract' | 'expenses' | 'guests'
    const eventId = formData.get('eventId') as string | null;

    if (!file) return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = file.name.toLowerCase();
    const ext = filename.split('.').pop();

    // --- PDF ---
    if (ext === 'pdf') {
      const pdfParseModule = await import('pdf-parse');
      const pdfParse = (pdfParseModule as any).default ?? pdfParseModule;
      const data = await pdfParse(buffer);
      return NextResponse.json({ text: data.text, type: 'text', filename: file.name });
    }

    // --- Word (.docx) ---
    if (ext === 'docx' || ext === 'doc') {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return NextResponse.json({ text: result.value, type: 'text', filename: file.name });
    }

    // --- Excel (.xlsx, .xls) ---
    if (ext === 'xlsx' || ext === 'xls') {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      return NextResponse.json({ rows, type: 'table', filename: file.name, sheet: sheetName });
    }

    // --- CSV ---
    if (ext === 'csv') {
      const text = buffer.toString('utf-8');
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
        return Object.fromEntries(headers.map((h, i) => [h, vals[i] || '']));
      });
      return NextResponse.json({ rows, type: 'table', filename: file.name, headers });
    }

    // --- Texte brut ---
    if (ext === 'txt') {
      return NextResponse.json({ text: buffer.toString('utf-8'), type: 'text', filename: file.name });
    }

    return NextResponse.json({ error: 'Format non supporté' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
