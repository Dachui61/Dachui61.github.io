import { validate } from '@jsonresume/schema';
import type { Locale } from '../i18n';
import { resumeLine, type ResumeHalf } from './resume';
import type { Resolved } from './entries';

export const JSON_RESUME_SCHEMA =
  'https://raw.githubusercontent.com/jsonresume/jsonresume.org/master/packages/schema/schema.json';

/** JSON Resume is a document-per-language format; this points at the other one. */
export type JsonResumeOptions = {
  half: ResumeHalf;
  locale: Locale;
  projects: Resolved[];
  origin: string;
  canonical: string;
  translationUrl: string;
};

/**
 * Map this site's résumé data onto JSON Resume v1.9.0.
 *
 * The site keeps its own shape because it can carry things the standard has
 * no place for — a proof link on a skill, a bilingual document in one file.
 * JSON Resume's `custom` object is the standard's sanctioned extension
 * point, so those extras travel as `custom.dachui61`.
 *
 * Everything the standard does define is mapped onto its exact field names,
 * so the result validates against the official schema.
 */
export function toJsonResume({
  half,
  locale,
  projects,
  origin,
  canonical,
  translationUrl,
}: JsonResumeOptions): Record<string, unknown> {
  const basics = half.basics;

  return {
    $schema: JSON_RESUME_SCHEMA,
    basics: {
      name: basics.name,
      label: basics.label,
      summary: basics.summary,
      ...(basics.email ? { email: basics.email } : {}),
      ...(basics.profiles.length ? { profiles: basics.profiles } : {}),
    },
    work: half.work.map((job) => ({
      name: job.name,
      position: job.position,
      ...(job.startDate ? { startDate: job.startDate } : {}),
      // An empty endDate means "still there" — JSON Resume says omit it.
      ...(job.endDate ? { endDate: job.endDate } : {}),
      ...(job.highlights.length ? { highlights: job.highlights } : {}),
    })),
    education: half.education.map((edu) => ({
      institution: edu.institution,
      ...(edu.area ? { area: edu.area } : {}),
      ...(edu.startDate ? { startDate: edu.startDate } : {}),
      ...(edu.endDate ? { endDate: edu.endDate } : {}),
    })),
    skills: half.skills.map((skill) => ({
      name: skill.name,
      ...(skill.note || skill.proof
        ? {
            custom: {
              dachui61: {
                ...(skill.note ? { note: skill.note } : {}),
                ...(skill.proof ? { proof: skill.proof } : {}),
              },
            },
          }
        : {}),
    })),
    awards: half.awards.map((award) => ({
      title: award.title,
      ...(award.awarder ? { awarder: award.awarder } : {}),
      ...(award.date ? { date: award.date } : {}),
      ...(award.url ? { url: award.url } : {}),
    })),
    certificates: half.certificates.map((cert) => ({
      name: cert.name,
      ...(cert.issuer ? { issuer: cert.issuer } : {}),
      ...(cert.date ? { date: cert.date } : {}),
      ...(cert.credentialId ? { credentialId: cert.credentialId } : {}),
      ...(cert.url ? { url: cert.url } : {}),
    })),
    projects: projects.map((project) => ({
      name: project.title,
      summary: resumeLine(project, locale),
      url: `${origin}/work/${project.slug}/`,
      ...(project.tech.length ? { highlights: project.tech, keywords: project.tech } : {}),
    })),
    meta: {
      canonical,
      version: '1.9.0',
      language: locale === 'zh' ? 'zh-CN' : 'en',
      translations: [
        {
          language: locale === 'zh' ? 'en' : 'zh-CN',
          url: translationUrl,
        },
      ],
    },
  };
}

type ValidationError = { property?: string; message?: string };

/**
 * Validate against the official JSON Resume schema.
 *
 * The schema is the point: a résumé that claims to be JSON Resume but does
 * not validate is worse than no export at all. So this runs at build time
 * and fails the build rather than shipping something unchecked.
 */
export function assertValidJsonResume(
  doc: Record<string, unknown>,
): { valid: true } | { valid: false; message: string } {
  return new Promise((resolve) => {
    validate(doc, (errors: ValidationError[] | null, valid: boolean) => {
      if (valid) {
        resolve({ valid: true });
        return;
      }
      const detail = (errors ?? [])
        .map((e) => `  - ${e.property ?? '(root)'}: ${e.message ?? 'invalid'}`)
        .join('\n');
      resolve({
        valid: false,
        message:
          `The résumé export does not conform to JSON Resume v1.9.0.\n` +
          `Fix content/profile/resume.yaml — dates must look like 2024, 2024-03 or 2024-03-01.\n` +
          detail,
      });
    });
  });
}
