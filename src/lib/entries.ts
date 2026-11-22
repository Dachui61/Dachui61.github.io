import { getCollection, render, type CollectionEntry } from 'astro:content';
import { pick, type Locale } from '../i18n';
import { groups, groupById, type Group } from './groups';

export type Work = CollectionEntry<'work'>;

export type Resolved = {
  entry: Work;
  slug: string;
  kind: Work['data']['kind'];
  title: string;
  summary: string;
  /** The language the body is actually written in. */
  bodyLocale: Locale;
  group: Group | undefined;
  date: Date | undefined;
  status: string;
  tech: string[];
  repo: string | undefined;
  featured: boolean;
};

const KIND_ORDER: Record<Work['data']['kind'], number> = {
  project: 0,
  note: 1,
  decision: 2,
};

export function resolve(entry: Work, locale: Locale): Resolved {
  const d = entry.data;
  return {
    entry,
    slug: d.slug,
    kind: d.kind,
    title: pick(locale, d.title, d.titleEn, d.title),
    summary: pick(locale, d.summary, d.summaryEn, d.summary),
    bodyLocale: d.locale,
    group: groupById(d.group),
    date: d.date,
    status: pick(locale, d.status, d.statusEn, d.status ?? ''),
    tech: d.tech,
    repo: d.repo,
    featured: d.featured,
  };
}

/** Every entry, resolved for a locale and ordered: projects, then notes, then decisions. */
export async function getResolved(locale: Locale): Promise<Resolved[]> {
  const entries = await getCollection('work');
  return entries
    .map((e) => resolve(e, locale))
    .sort((a, b) => {
      const byKind = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
      if (byKind !== 0) return byKind;
      const byOrder = (a.entry.data.order || 0) - (b.entry.data.order || 0);
      if (byOrder !== 0) return byOrder;
      return (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0);
    });
}

/** Entries bucketed by their group, in the order the groups are declared. */
export function byGroup(entries: Resolved[]): { group: Group; items: Resolved[] }[] {
  return groups
    .map((group) => ({ group, items: entries.filter((e) => e.group?.id === group.id) }))
    .filter((bucket) => bucket.items.length > 0);
}

export async function getBySlug(slug: string): Promise<Resolved | undefined> {
  const entries = await getCollection('work');
  const entry = entries.find((e) => e.data.slug === slug);
  return entry ? resolve(entry, 'zh') : undefined;
}

export { render };
