import { getCollection, getEntry } from 'astro:content';
import { pick, type Locale } from '../i18n';
import { getResolved, type Resolved } from './entries';

export type ResumeHalf = {
  label: string;
  summary: string;
  contact: { email: string; links: { label: string; url: string }[] };
  experiences: {
    period: string;
    role: string;
    org: string;
    highlights: string[];
  }[];
  education: { institution: string; area: string; period: string }[];
  skills: { name: string; note: string; proof?: string }[];
  awards: { title: string; issuer: string; date: string; url?: string }[];
};

export type Resume = {
  half: ResumeHalf;
  /** Featured catalogue entries, split by kind. */
  projects: Resolved[];
  writing: Resolved[];
  /** A skill's `proof` slug resolved to the entry that proves it. */
  proofs: Map<string, Resolved>;
};

/**
 * Assemble the résumé for one language.
 *
 * The structured half comes from content/profile/resume.yaml. The featured
 * projects and writing come from the catalogue itself — anything marked
 * `featured: true` — so the résumé can never disagree with the work it
 * points at.
 */
export async function getResume(locale: Locale): Promise<Resume> {
  const entry = await getEntry('resume', 'resume');
  if (!entry) throw new Error('content/profile/resume.yaml is missing');

  const half = (entry.data as { zh: ResumeHalf; en: ResumeHalf })[locale];

  const all = await getResolved(locale);
  const featured = all.filter((e) => e.entry.data.featured);

  const projects = featured.filter((e) => e.kind === 'project');
  const writing = featured.filter((e) => e.kind === 'note');

  const proofs = new Map<string, Resolved>();
  for (const skill of half.skills) {
    if (!skill.proof) continue;
    const match = all.find((e) => e.slug === skill.proof);
    if (match) proofs.set(skill.proof, match);
  }

  return { half, projects, writing, proofs };
}

/** The one line a featured entry shows on the résumé. */
export function resumeLine(item: Resolved, locale: Locale): string {
  const d = item.entry.data;
  return pick(locale, d.resumeLine, d.resumeLineEn, item.summary);
}
