import { generateText, Output } from 'ai';
import { z } from 'zod';
import { applyKnownMeasures, cabinetToParts, type CabinetSpec } from '@/lib/cabinet-parts';
import { photoModel, safeCabinetNote } from '@/lib/photo-access';

const proposalSchema = z.object({
  name: z.string().max(60),
  heightMm: z.number().min(200).max(3000),
  depthMm: z.number().min(80).max(1200),
  thicknessMm: z.number().min(3).max(40),
  sections: z.number().int().min(1).max(8),
  shelvesPerSection: z.number().int().min(0).max(10),
  doors: z.number().int().min(0).max(8),
  drawers: z.number().int().min(0).max(8),
  note: z.string().max(400),
});

function promptFor(widthMm: number, heightMm: number | null): string {
  const heightLine = heightMm
    ? `Højden er målt til ${heightMm} mm og skal bruges som skabets ydre højde.`
    : 'Højden er ikke målt. Skøn en realistisk ydre højde i mm ud fra fotoet.';
  return [
    'Du ser et foto af en væg, hvor der skal stå ét skab. Foreslå skabet.',
    `Den kendte bredde er ${widthMm} mm. Skabet skal passe til den bredde.`,
    heightLine,
    'Sider, top, bund, hylder, ryg, låger og eventuelle skuffefronter skæres senere ud fra pladetykkelsen. Find ikke på mål til de enkelte emner.',
    'sections er antal lodrette fag. shelvesPerSection er hylder i hvert fag, uden top og bund.',
    'doors er låger ved siden af hinanden. drawers er skuffefronter stablet nederst.',
    'depthMm er den ydre dybde inkl. ryg. thicknessMm er pladetykkelsen. Brug 18, hvis fotoet ikke viser andet.',
    'name er et kort dansk navn, fx Skab.',
    'note er én kort dansk sætning om det, du ser.',
    'Nævn aldrig pris, beløb, valuta, butik eller tilbud.',
  ].join('\n');
}

export async function proposeCabinetFromPhoto(input: {
  bytes: Uint8Array;
  mediaType: string;
  widthMm: number;
  heightMm: number | null;
  abortSignal?: AbortSignal;
}): Promise<{ ok: true; cabinet: CabinetSpec; note: string } | { ok: false; code: 'ai_failed' | 'invalid_cabinet' }> {
  try {
    const { output } = await generateText({
      model: photoModel(),
      maxRetries: 1,
      timeout: 45_000,
      abortSignal: input.abortSignal,
      output: Output.object({ schema: proposalSchema }),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: promptFor(input.widthMm, input.heightMm) },
            { type: 'file', mediaType: input.mediaType, data: input.bytes },
          ],
        },
      ],
    });
    if (!output) return { ok: false, code: 'ai_failed' };
    const cabinet = applyKnownMeasures(
      {
        name: output.name,
        heightMm: output.heightMm,
        depthMm: output.depthMm,
        thicknessMm: output.thicknessMm,
        sections: output.sections,
        shelvesPerSection: output.shelvesPerSection,
        doors: output.doors,
        drawers: output.drawers,
      },
      { widthMm: input.widthMm, heightMm: input.heightMm },
    );
    const parts = cabinetToParts(cabinet);
    if (!parts.ok) return { ok: false, code: 'invalid_cabinet' };
    return { ok: true, cabinet, note: safeCabinetNote(output.note) };
  } catch (error) {
    console.error('photo cabinet vision failed', error instanceof Error ? error.name : 'unknown');
    return { ok: false, code: 'ai_failed' };
  }
}
