import { DAY, shiftDate, todayKey } from './dates';
import { DataError } from './data';
import type { ScoreInputs } from './rating';

const demo = {
  ai: [
    { id: 'demo-ai-1', title: '示例研究团队发布新的模型评测数据集',
      what_happened: '示例研究团队公开了一套用于测试模型如何处理证据冲突的数据集。与分数同时发布的还有题目、答题记录和评分说明。',
      possible_impact: '研究人员可以在相同题目上比较不同模型，也能进一步检查分数背后的具体错误。',
      source_name: '演示来源 · 研究简报', uncertainty_note: null },
    { id: 'demo-ai-2', title: '开源工具更新本地推理的内存观察功能',
      what_happened: '这条示例展示软件更新类消息的写法。新版工具将峰值内存与加载时间分开显示，并为长文本请求提供独立记录。',
      possible_impact: '使用者可据此判断长文本任务的设备需求。', source_name: '演示来源 · 更新公告',
      uncertainty_note: '后续设备兼容名单尚未得到证实。' },
    { id: 'demo-ai-3', title: '示例公共资料库公布文档整理方案',
      what_happened: '资料库将文档按版本存档，并在每份说明旁标出修订日期。', source_name: '演示来源 · 项目说明' },
  ],
  world: [
    { id: 'demo-world-1', title: '示例港口发布新的货运预约试行安排',
      what_happened: '这条示例展示物流类消息的写法。试行安排为部分货运时段增加预约窗口，并公布异常情况下的改约流程。',
      possible_impact: '承运方可以提前分配车辆；实际等待时间仍需试行数据验证。',
      source_name: '演示来源 · 交通公告', uncertainty_note: null },
    { id: 'demo-world-2', title: '示例统计机构调整季度数据发布格式',
      what_happened: '发布材料将增加便于下载的表格，并保留历史版本供对照。',
      source_name: '演示来源 · 统计通报' },
  ],
};

const demoScores: Record<string, ScoreInputs> = {
  'demo-ai-1': { impact: 4, novelty: 5, evidence: 5, relevance: 4, utility: 4 },
  'demo-ai-2': { impact: 3, novelty: 4, evidence: 4, relevance: 3, utility: 4 },
  'demo-ai-3': { impact: 2, novelty: 3, evidence: 4, relevance: 2, utility: 3 },
  'demo-world-1': { impact: 4, novelty: 4, evidence: 5, relevance: 3, utility: 4 },
  'demo-world-2': { impact: 3, novelty: 3, evidence: 5, relevance: 3, utility: 4 },
};

const demoImages: Record<string, [string, string][]> = {
  'demo-ai-1': [['eval-dataset', '多层叠放的评测样本和两组不同颜色的数据点'], ['eval-score', '一份含对照曲线与核对标记的评测报告']],
  'demo-ai-2': [['memory-chip', '带有走线和焊点的处理器示意图'], ['memory-chart', '一块展示内存峰值与负载变化的监测面板']],
  'demo-ai-3': [['archive-folders', '三份带彩色标签的归档文件夹'], ['archive-index', '可查阅不同修订版本的资料索引示意图']],
  'demo-world-1': [['port-crane', '港口吊机在水边装卸集装箱的示意图'], ['port-calendar', '带有预约日期和时间窗口的日历示意图']],
  'demo-world-2': [['stats-bars', '按季度分组的柱状图示意图'], ['stats-table', '用底色突出数据行的统计表格示意图']],
};

function available(date: string) {
  const age = Math.round((Date.parse(todayKey()) - Date.parse(date)) / DAY);
  return age >= 0 && age <= 180 && age % 7 !== 2;
}

function delay(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, 280);
    function abort() { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); }
    signal.addEventListener('abort', abort, { once: true });
  });
}

export async function mockBrief(date: string, signal: AbortSignal) {
  await delay(signal);
  if (!available(date)) throw new DataError('missing');
  const age = Math.round((Date.parse(todayKey()) - Date.parse(date)) / DAY);
  return {
    date, timezone: 'Asia/Shanghai', coverage_start: `${shiftDate(date, -1)}T08:00:00+08:00`,
    coverage_end: `${date}T08:00:00+08:00`, generated_at: `${date}T08:00:00+08:00`,
    sections: (['ai', 'world'] as const).map((id) => ({
      id, items: id === 'world' && age % 3 === 1 ? [] : demo[id].map((item, index) => ({
        ...item, source_url: index < 2 ? 'https://example.com/' : undefined,
        published_at: index === 0 ? `${date}T06:15:00+08:00` : index === 1 ? `${shiftDate(date, -1)}T16:20:00+08:00` : undefined,
        images: demoImages[item.id].map(([name, alt]) => ({ url: `/illustrations/${name}.svg`, alt })),
        editorial_score: demoScores[item.id],
      })),
    })),
  };
}

export async function mockHistory(end: string, start: string, signal: AbortSignal) {
  await delay(signal);
  const dates = new Set<string>();
  for (let date = end; date >= start; date = shiftDate(date, -1)) if (available(date)) dates.add(date);
  return dates;
}
