export type GroupId = 'ship' | 'decide' | 'verify';

export type Group = {
  id: GroupId;
  num: string;
  titleZh: string;
  titleEn: string;
  taglineZh: string;
  taglineEn: string;
};

/**
 * The catalogue is organised as a flow, not as a list of categories:
 * 01 ships something, 02 records what was traded away, 03 goes back to
 * primary sources before concluding anything.
 */
export const groups: Group[] = [
  {
    id: 'ship',
    num: '01',
    titleZh: '做出来',
    titleEn: 'Ship',
    taglineZh: '把想法变成能跑起来的东西。',
    taglineEn: 'Turning an idea into something you can actually run.',
  },
  {
    id: 'decide',
    num: '02',
    titleZh: '记下取舍',
    titleEn: 'Record the trade-offs',
    taglineZh: '每个决定都写清楚，为什么别的路被否掉了。',
    taglineEn: 'Every decision says which paths were rejected, and why.',
  },
  {
    id: 'verify',
    num: '03',
    titleZh: '查证',
    titleEn: 'Verify',
    taglineZh: '先回到一手来源，再下结论。取不到就写「未取到」。',
    taglineEn: 'Go back to primary sources first. If it could not be fetched, write so.',
  },
];

export function groupById(id: string): Group | undefined {
  return groups.find((g) => g.id === id);
}
