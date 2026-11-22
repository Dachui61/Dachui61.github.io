import type { APIRoute } from 'astro';
import { getResolved } from '../lib/entries';

export const GET: APIRoute = async ({ site }) => {
  const origin = site?.toString().replace(/\/$/, '') ?? '';
  const entries = await getResolved('zh');

  const lines: string[] = [
    '# Dachui61.github.io',
    '',
    '> 刘宇的个人站：自用 macOS 工具、调研笔记与工程决策记录。',
    '> Yu Liu — personal site: macOS tools built for personal use, research notes, and engineering decision records.',
    '',
    'The site is written to be read by machines as well as people. Every entry has a',
    'stable URL, an English title and summary, and a Markdown twin is not required —',
    'the source of truth is the Git repository.',
    '',
    '## Projects',
    '',
  ];

  for (const item of entries.filter((e) => e.kind === 'project')) {
    lines.push(`- [${item.titleEn ?? item.title}](${origin}/work/${item.slug}/): ${item.summaryEn ?? item.summary}`);
  }

  lines.push('', '## Research notes', '');
  for (const item of entries.filter((e) => e.kind === 'note')) {
    lines.push(`- [${item.titleEn ?? item.title}](${origin}/work/${item.slug}/): ${item.summaryEn ?? item.summary}`);
  }

  lines.push('', '## Decision records', '');
  for (const item of entries.filter((e) => e.kind === 'decision')) {
    lines.push(`- [${item.titleEn ?? item.title}](${origin}/work/${item.slug}/): ${item.summaryEn ?? item.summary}`);
  }

  lines.push('', '## Notes', '');
  lines.push('- Source repository: https://github.com/Dachui61/Dachui61.github.io');
  lines.push('- Content is licensed per entry; code samples are illustrative.');
  lines.push('- If a reading could not be fetched, this site says "not fetched" rather than guessing.');

  return new Response(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
