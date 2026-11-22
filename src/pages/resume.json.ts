import type { APIRoute } from 'astro';
import { getResume } from '../lib/resume';
import { assertValidJsonResume, toJsonResume } from '../lib/jsonresume';

/**
 * The résumé in JSON Resume v1.9.0 — a format every tool in that
 * ecosystem reads: the 228 themes on jsonresume.org, `resume-cli`, and
 * anything that wants a machine-readable version of this page.
 *
 * Validated against the official schema at build time. If the content
 * stops conforming, the build fails here rather than shipping a document
 * that only claims to be JSON Resume.
 */
export const GET: APIRoute = async ({ site }) => {
  const origin = site?.toString().replace(/\/$/, '') ?? '';
  const { half, projects } = await getResume('zh');

  const doc = toJsonResume({
    half,
    locale: 'zh',
    projects,
    origin,
    canonical: `${origin}/resume.json`,
    translationUrl: `${origin}/en/resume.json`,
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
