import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const work = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/work' }),
  schema: z.object({
    /** Stable identifier, shared across language versions of the same entry. */
    slug: z.string(),
    kind: z.enum(['project', 'note', 'decision']),
    /** Which language this particular file is written in. */
    locale: z.enum(['zh', 'en']).default('zh'),
    title: z.string(),
    titleEn: z.string().optional(),
    summary: z.string(),
    summaryEn: z.string().optional(),
    /** One line aimed at a hiring manager — shown on the résumé. */
    resumeLine: z.string().optional(),
    resumeLineEn: z.string().optional(),
    group: z.string(),
    order: z.number().default(0),
    date: z.coerce.date().optional(),
    updated: z.coerce.date().optional(),
    status: z.string().optional(),
    statusEn: z.string().optional(),
    tech: z.array(z.string()).default([]),
    repo: z.string().optional(),
    /** Whether this entry is worth surfacing on the landing page. */
    featured: z.boolean().default(false),
    /** Whether a body exists for this locale. */
    hasBody: z.boolean().default(true),
  }),
});

/** One half of a résumé. The two halves are the same shape. */
const resumeHalf = z.object({
  /** One line. What you are. */
  label: z.string(),
  /** Two or three paragraphs of prose. */
  summary: z.string(),
  contact: z
    .object({
      email: z.string().default(''),
      links: z
        .array(
          z.object({
            label: z.string(),
            url: z.string(),
          }),
        )
        .default([]),
    })
    .default({ email: '', links: [] }),
  experiences: z
    .array(
      z.object({
        period: z.string(),
        role: z.string(),
        org: z.string(),
        highlights: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  education: z
    .array(
      z.object({
        institution: z.string(),
        area: z.string().default(''),
        period: z.string().default(''),
      }),
    )
    .default([]),
  skills: z
    .array(
      z.object({
        name: z.string(),
        note: z.string().default(''),
        /** Slug of a `work` entry that proves this skill. */
        proof: z.string().optional(),
      }),
    )
    .default([]),
  awards: z
    .array(
      z.object({
        title: z.string(),
        issuer: z.string().default(''),
        date: z.string().default(''),
        url: z.string().optional(),
      }),
    )
    .default([]),
});

const resume = defineCollection({
  loader: file('content/profile/resume.yaml'),
  schema: z.object({
    zh: resumeHalf,
    en: resumeHalf,
  }),
});

export const collections = { work, resume };
