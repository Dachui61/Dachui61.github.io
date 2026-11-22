import type { APIRoute } from 'astro';
import { getResume } from '../../lib/resume';
import { assertValidJsonResume, toJsonResume } from '../../lib/jsonresume';

export const GET: APIRoute = async ({ site }) => {
  const origin = site?.toString().replace(/\/$/, '') ?? '';
  const { half, projects } = await getResume('en');

  const doc = toJsonResume({
    half,
    locale: 'en',
    projects,
    origin,
    canonical: `${origin}/en/resume.json`,
    translationUrl: `${origin}/resume.json`,
  });

  const check = await assertValidJsonResume(doc);
  if (!check.valid) {
    throw new Error(check.message);
  }

  return new Response(JSON.stringify(doc, null, 2) + '\n', {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
};
