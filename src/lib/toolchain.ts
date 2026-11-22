/**
 * The toolchain this site is built with, and the tools it is built on.
 *
 * None of these are authored by me. They are what I reach for every day, and
 * they are listed here with their real source so the credit is where it
 * belongs.
 */
export type ToolSource = {
  id: string;
  name: string;
  author: string;
  url: string;
  license: string;
  count: number;
  picks: string[];
};

export const toolchain: ToolSource[] = [
  {
    id: 'mattpocock-skills',
    name: 'mattpocock/skills',
    author: 'Matt Pocock',
    url: 'https://github.com/mattpocock/skills',
    license: 'see repository',
    count: 27,
    picks: ['grill-with-docs', 'code-review', 'research', 'wayfinder', 'domain-modeling'],
  },
  {
    id: 'hyperframes',
    name: 'heygen-com/hyperframes',
    author: 'HeyGen',
    url: 'https://github.com/heygen-com/hyperframes',
    license: 'see repository',
    count: 6,
    picks: ['hyperframes', 'hyperframes-registry', 'media-use', 'reverse-any-video'],
  },
  {
    id: 'garden-skills',
    name: 'garden-skills',
    author: 'Garden',
    url: 'https://github.com/garden-skills',
    license: 'see repository',
    count: 6,
    picks: ['web-design-engineer', 'web-video-presentation', 'beautiful-article', 'motion-showreel'],
  },
  {
    id: 'vercel-skills',
    name: 'vercel-labs/skills',
    author: 'Vercel Labs',
    url: 'https://github.com/vercel-labs/skills',
    license: 'see repository',
    count: 1,
    picks: ['find-skills'],
  },
];

export const toolchainTotal = toolchain.reduce((sum, t) => sum + t.count, 0);
