import { useId } from 'react';
import type { NewsItem, SectionId } from './data';

const themes = {
  diplomacy: ['国际外交', 'DIPLOMACY'], law: ['司法与治理', 'LAW & GOVERNANCE'],
  maritime: ['航运与海事', 'MARITIME'], infrastructure: ['基础设施', 'INFRASTRUCTURE'],
  hazard: ['灾害与环境', 'ENVIRONMENT'], health: ['公共卫生', 'PUBLIC HEALTH'],
  economy: ['经济与市场', 'ECONOMY'], chips: ['芯片与算力', 'COMPUTE'],
  research: ['研究与评估', 'RESEARCH'], voices: ['业内发言', 'AI VOICES'],
  ai: ['人工智能', 'ARTIFICIAL INTELLIGENCE'], world: ['国际新闻', 'WORLD DESK'],
} as const;

type Theme = keyof typeof themes;
const worldTopics: [Theme, RegExp][] = [
  ['health', /麻疹|疫苗|传染病|公共卫生|疾病|药品|医院|疫情|病毒|患病/],
  ['hazard', /山火|野火|森林火灾|暴雨|洪水|台风|地震|海啸|火山|高温|气候|灾害/],
  ['maritime', /船只|船舶|油轮|货轮|港口|航运|海峡|沉船|海上|海事/],
  ['infrastructure', /大桥|桥梁|铁路|机场|轨道|水坝|电网|基础设施/],
  ['diplomacy', /谈判|外交|峰会|联合国|武官|外交官|国事访问|大使|停火协议/],
  ['law', /签令|行政令|执法|协商|法院|判决|裁定|通缉|逮捕|抓获|立法|国会|司法|法案|选举/],
  ['economy', /央行|降息|加息|股市|关税|经济|通胀|银行|贸易|油价|市场|债券/],
];
const aiTopics: [Theme, RegExp][] = [
  ['chips', /芯片|半导体|晶圆|算力|\bGPU\b|数据中心|加速卡/i],
  ['voices', /访谈|采访|谈到|表示|演讲|圆桌|播客|分享|署名|公开信|接受.{0,20}访问/],
  ['research', /实验|评估|基准|论文|研究|测试|训练方法|数据集|复现/],
  ['law', /监管|立法|法案|法院|判决|诉讼|法规/],
];

export function illustrationTheme(item: NewsItem, section: SectionId): Theme {
  const topics = section === 'ai' ? aiTopics : worldTopics;
  return topics.find(([, pattern]) => pattern.test(item.title))?.[0]
    ?? topics.find(([, pattern]) => pattern.test(item.what_happened ?? ''))?.[0]
    ?? section;
}

function Motif({ theme }: { theme: Theme }) {
  switch (theme) {
    case 'diplomacy': return <>
      <ellipse cx="95" cy="105" rx="72" ry="29" fill="#242321" />
      <path d="M43 108v25m104-25v25M63 55v29m58-37v35M64 56h26l-7 7 7 7H64m58-22h26l-7 7 7 7h-26" />
      <path d="M60 99l12 6 16-8-12-6Zm48 6 12-6 16 7-12 7Z" fill="#f3f0e8" stroke="#f3f0e8" />
      <path d="M27 61h10m122 14h10M85 34h10" />
    </>;
    case 'law': return <>
      <path d="M62 42h61l26 26v73H62z" fill="#f3f0e8" />
      <path d="M123 42v26h26M77 68h28M77 84h57M77 96h43M77 108h22M42 142h118" />
      <circle cx="123" cy="116" r="13" fill="#242321" />
      <path d="m117 116 4 4 7-8" stroke="#f3f0e8" />
      <path d="M44 65v60m118-38v34M53 55v80" strokeDasharray="2 5" />
    </>;
    case 'maritime': return <>
      <path d="M28 105h134l-17 23H54z" fill="#242321" />
      <path d="M53 104V80h24v24m0-15h22v15m0-15h22v15m0-15h22v15M63 80V55m0 7 22 8H63" />
      <path d="M22 137q10-8 20 0t20 0 20 0 20 0 20 0 20 0 20 0 20 0M32 148q10-8 20 0t20 0 20 0 20 0 20 0 20 0 20 0" />
      <circle cx="142" cy="56" r="14" fill="none" strokeDasharray="2 4" />
    </>;
    case 'infrastructure': return <>
      <path d="M20 110h154M45 140V51h10v89m85 0V51h10v89" />
      <path d="M20 96q17-9 30-45 45 112 95 0 14 34 29 45M71 84v26m22-10v10m22-12v12m14-28v28M23 133h150M31 144h133" />
    </>;
    case 'hazard': return <>
      <path d="M26 136l39-52 25 34 24-34 44 52M24 136h143" />
      <path d="M97 90c-17-17 5-29 6-47 13 10 20 19 15 31 8-2 11-9 12-12 13 22 4 39-13 44" fill="#242321" />
      <path d="M51 119h20m-13 7h21m56-13h15M42 145h113" strokeDasharray="2 4" />
    </>;
    case 'health': return <>
      <circle cx="96" cy="91" r="47" fill="#f3f0e8" />
      <path d="M89 65h14v19h19v14h-19v19H89V98H70V84h19z" fill="#242321" />
      <path d="M20 137h31l10-8 13 13 10-6h28l10-13 10 19 12-5h30M46 53l-7-6m108 6 7-6" />
    </>;
    case 'economy': return <>
      <path d="M39 51v88h117M55 137v-28h20v28m12 0v-49h20v49m12 0V68h20v69" />
      <path d="m55 91 33-32 17 11 34-30m-16 0h16v16" />
      <path d="M46 76h107m-107 23h107m-107 22h107" strokeDasharray="2 5" opacity=".45" />
    </>;
    case 'chips': return <>
      <rect x="54" y="51" width="87" height="87" rx="7" fill="#242321" />
      <rect x="72" y="69" width="51" height="51" rx="3" fill="#f3f0e8" stroke="#f3f0e8" />
      <path d="M67 33v17m20-17v17m20-17v17m20-17v17m-60 89v17m20-17v17m20-17v17m20-17v17M36 65h17m-17 20h17m-17 20h17m-17 20h17m89-60h17m-17 20h17m-17 20h17m-17 20h17M86 106v-21h23v21z" />
    </>;
    case 'research': return <>
      <rect x="49" y="45" width="100" height="93" rx="5" fill="#f3f0e8" />
      <path d="M49 64h100M63 54h2m8 0h2m8 0h2m-23 66 19-31 20 14 19-23 15 12" />
      <circle cx="81" cy="89" r="4" fill="#242321" /><circle cx="120" cy="80" r="4" fill="#242321" />
      <path d="M62 77v46h73M39 145h121" />
    </>;
    case 'voices': return <>
      <path d="M46 49h103v65H99l-23 19v-19H46z" fill="#242321" />
      <path d="M71 88h9l7-16 9 25 12-34 9 25h10" stroke="#f3f0e8" />
      <path d="M35 60v65h23m54 0h47V66M79 146h48" strokeDasharray="2 5" />
    </>;
    case 'ai': return <>
      <path d="m43 91 35-37 38 19 33-16M43 91l40 34 33-52 32 47m-70-66 5 71 65-5m1-63-1 63" />
      {[[43,91],[78,54],[83,125],[116,73],[149,57],[148,120]].map(([cx,cy]) => <circle key={cx} cx={cx} cy={cy} r="8" fill="#f3f0e8" />)}
      <circle cx="116" cy="73" r="4" fill="#242321" />
    </>;
    case 'world': return <>
      <circle cx="98" cy="91" r="52" fill="#f3f0e8" />
      <ellipse cx="98" cy="91" rx="23" ry="52" />
      <path d="M47 91h102M53 69q45 18 90 0m-90 44q45-18 90 0M98 39v104" />
      <path d="M25 117q41-48 142-51" strokeDasharray="2 5" />
    </>;
  }
}

export function NewsArt({ item, section }: { item: NewsItem; section: SectionId }) {
  const theme = illustrationTheme(item, section);
  const [label, desk] = themes[theme];
  const texture = useId();
  return <figure className="editorial-art" data-theme={theme}>
    <div className="editorial-art-frame">
      <svg viewBox="0 0 196 180" aria-hidden="true" focusable="false">
        <defs><pattern id={texture} width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".55" fill="#242321" /></pattern></defs>
        <rect x="12" y="14" width="172" height="152" fill={`url(#${texture})`} opacity=".27" />
        <g stroke="#242321" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none"><Motif theme={theme} /></g>
      </svg>
      <div className="editorial-art-type"><span lang="en">{desk}</span><strong>{label}</strong><small>一日之计 · 新闻图解</small></div>
    </div>
    <figcaption>主题示意图，非新闻现场照片</figcaption>
  </figure>;
}
