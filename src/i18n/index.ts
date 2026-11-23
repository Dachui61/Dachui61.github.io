export const locales = ['zh', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'zh';

export function isLocale(value: string | undefined): value is Locale {
  return value === 'zh' || value === 'en';
}

/** Strip a leading locale segment, if any. */
export function stripLocale(pathname: string): string {
  const clean = pathname.replace(/^\/+/, '');
  if (clean.startsWith('en/')) return `/${clean.slice(3)}`;
  return `/${clean}`;
}

/** Build the path for a given locale, keeping the rest of the route intact. */
export function pathForLocale(pathname: string, locale: Locale): string {
  const stripped = stripLocale(pathname);
  if (locale === defaultLocale) return stripped;
  return stripped === '/' ? '/en/' : `/en${stripped}`;
}

export function hrefFor(pathname: string, locale: Locale, hash = ''): string {
  const path = pathForLocale(pathname, locale);
  return `${path}${hash}`;
}

type Strings = {
  siteName: string;
  siteTagline: string;
  nav: { work: string; notes: string; decisions: string; films: string; resume: string; about: string };
  actions: {
    browseWork: string;
    readNotes: string;
    viewRepo: string;
    readDecision: string;
    search: string;
    menu: string;
    close: string;
  };
  theme: { label: string; system: string; light: string; dark: string };
  lang: { label: string; zh: string; en: string };
  home: {
    countersLabel: string;
    latestNote: string;
    allNotes: string;
    allDecisions: string;
    featured: string;
    toolchain: string;
    toolchainNote: string;
  };
  catalog: {
    groupsLabel: string;
    empty: string;
    count: string;
  };
  entry: {
    backToCatalog: string;
    originalIsChinese: string;
    originalIsEnglish: string;
    updated: string;
    status: string;
    tech: string;
    related: string;
  };
  footer: {
    builtWith: string;
    sourceOn: string;
    contact: string;
    rights: string;
  };
};

export const ui: Record<Locale, Strings> = {
  zh: {
    siteName: '刘宇',
    siteTagline: '把一件机器的状态讲清楚',
    nav: { work: '作品', notes: '调研笔记', decisions: '决策记录', films: '短片', resume: '简历', about: '关于' },
    actions: {
      browseWork: '看作品',
      readNotes: '读调研笔记',
      viewRepo: '看源码',
      readDecision: '读决策记录',
      search: '搜索',
      menu: '菜单',
      close: '关闭',
    },
    theme: { label: '主题', system: '跟随系统', light: '浅色', dark: '深色' },
    lang: { label: '语言', zh: '中文', en: 'English' },
    home: {
      countersLabel: '现状',
      latestNote: '最新调研笔记',
      allNotes: '全部调研笔记',
      allDecisions: '全部决策记录',
      featured: '精选',
      toolchain: '我依赖的工具链',
      toolchainNote: '下面这些不是我写的。它们是我每天在用的东西，来源和许可证都标清楚了。',
    },
    catalog: {
      groupsLabel: '目录',
      empty: '这一组还是空的。',
      count: '条',
    },
    entry: {
      backToCatalog: '回到目录',
      originalIsChinese: '本文原文为中文，尚未提供英文版。',
      originalIsEnglish: 'This entry is written in English.',
      updated: '更新于',
      status: '状态',
      tech: '技术',
      related: '相关',
    },
    footer: {
      builtWith: '本站由 Astro 构建，托管在 GitHub Pages。',
      sourceOn: '源码',
      contact: '联系',
      rights: '保留所有权利。',
    },
  },
  en: {
    siteName: 'Yu Liu',
    siteTagline: 'Reading one machine honestly',
    nav: { work: 'Work', notes: 'Research notes', decisions: 'Decisions', films: 'Films', resume: 'Résumé', about: 'About' },
    actions: {
      browseWork: 'See the work',
      readNotes: 'Read the notes',
      viewRepo: 'View source',
      readDecision: 'Read the decision',
      search: 'Search',
      menu: 'Menu',
      close: 'Close',
    },
    theme: { label: 'Theme', system: 'Follow system', light: 'Light', dark: 'Dark' },
    lang: { label: 'Language', zh: '中文', en: 'English' },
    home: {
      countersLabel: 'Status',
      latestNote: 'Latest research note',
      allNotes: 'All research notes',
      allDecisions: 'All decision records',
      featured: 'Featured',
      toolchain: 'Tools I depend on',
      toolchainNote: 'None of these are mine. They are what I use every day — sources and licences are credited.',
    },
    catalog: {
      groupsLabel: 'Contents',
      empty: 'This group is still empty.',
      count: 'entries',
    },
    entry: {
      backToCatalog: 'Back to the catalogue',
      originalIsChinese: 'The original of this entry is in Chinese; no English version yet.',
      originalIsEnglish: 'This entry is written in English.',
      updated: 'Updated',
      status: 'Status',
      tech: 'Stack',
      related: 'Related',
    },
    footer: {
      builtWith: 'Built with Astro, hosted on GitHub Pages.',
      sourceOn: 'Source',
      contact: 'Contact',
      rights: 'All rights reserved.',
    },
  },
};

/** Pick the right string from a bilingual field. */
export function pick(locale: Locale, zh: string | undefined, en: string | undefined, fallback?: string): string {
  const primary = locale === 'zh' ? zh : en;
  const secondary = locale === 'zh' ? en : zh;
  return primary ?? secondary ?? fallback ?? '';
}
