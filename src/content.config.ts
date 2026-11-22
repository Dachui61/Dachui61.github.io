import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
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

export const collections = { work };
