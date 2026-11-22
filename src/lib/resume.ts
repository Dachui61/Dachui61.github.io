import { getCollection, getEntry } from 'astro:content';
import { pick, type Locale } from '../i18n';
import { getResolved, type Resolved } from './entries';

export type ResumeHalf = {
  basics: {
    name: string;
    label: string;
    summary: string;
    email: string;
    phone: string;
    location: { city: string; countryCode: string };
    profiles: { network: string; username: string; url: string }[];
  };
  work: {
    name: string;
    position: string;
    type: string;
    startDate: string;
    endDate: string;
    highlights: string[];
    keywords: string[];
  }[];
  education: {
    institution: string;
    area: string;
    startDate: string;
    endDate: string;
  }[];
  projects: {
    name: string;
    summary: string;
    entity: string;
    startDate: string;
    endDate: string;
    url: string;
    highlights: string[];
    keywords: string[];
  }[];
  skills: { name: string; note: string; proof?: string }[];
  awards: { title: string; awarder: string; date: string; url?: string }[];
  certificates: {
    name: string;
    issuer: string;
    date: string;
    credentialId: string;
    url?: string;
  }[];
};

export type Resume = {
  half: ResumeHalf;
  /** Featured catalogue entries — projects and notes. */
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
 * points at. Projects that are not catalogue entries live in the YAML.
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

/** Render a date range the way a résumé does: an empty end means "present". */
export function dateRange(
  start: string,
  end: string,
  locale: Locale,
): string {
  if (!start && !end) return '';
  const present = locale === 'zh' ? '至今' : 'present';
  if (!end) return `${start} — ${present}`;
  return `${start} — ${end}`;
}
