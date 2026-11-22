export const MAX_SCORE = 5;

export const RATING_AXES = [
  { id: 'impact', label: '事件分量', weight: 30, description: '是否有重要的实质变化' },
  { id: 'novelty', label: '信息增量', weight: 20, description: '是否提供了此前未知的明确事实' },
  { id: 'evidence', label: '证据强度', weight: 25, description: '核心事实能否追溯和核对' },
  { id: 'relevance', label: '读者相关性', weight: 15, description: '与产业、社会或个人的关系有多直接' },
  { id: 'utility', label: '参考价值', weight: 10, description: '是否帮助读者理解变化或作出判断' },
] as const;

type Axis = (typeof RATING_AXES)[number]['id'];
export type ScoreInputs = Record<Axis, number>;
export type Rating = { kind: 'weighted'; value: number; axes: ScoreInputs; capped: boolean } | { kind: 'importance'; value: number };

export function parseScoreInputs(input: unknown): ScoreInputs | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
  const values = input as Record<string, unknown>;
  const axes = {} as ScoreInputs;
  for (const { id } of RATING_AXES) {
    const score = values[id];
    if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > MAX_SCORE) return undefined;
    axes[id] = score;
  }
  return axes;
}

export function newsRating(axes: ScoreInputs | undefined, importance: number | undefined): Rating | undefined {
  if (axes) {
    const weightedSum = RATING_AXES.reduce((sum, { id, weight }) => sum + axes[id] * weight, 0);
    const capped = axes.evidence <= 1 && weightedSum > 200;
    return { kind: 'weighted', value: Math.round(Math.min(weightedSum, capped ? 200 : 500) / 10) / 10, axes, capped };
  }
  if (importance !== undefined && Number.isInteger(importance) && importance >= 1 && importance <= MAX_SCORE) {
    return { kind: 'importance', value: importance };
  }
}
