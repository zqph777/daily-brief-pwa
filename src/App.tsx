import { useEffect, useId, useLayoutEffect, useState, type KeyboardEvent, type ReactNode } from 'react';
import { BrowserRouter, HashRouter, Link, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { configurePrivateAccess, IS_IOS_BUILD, IS_MOCK, IS_PRIVATE_BUILD, latestBrief, loadBrief, loadHistory, pruneCache, readBrief, readHistory, SECTIONS, type Brief, type NewsImage, type NewsItem, type SectionId } from './data';
import { dateLabel, inRetention, isDateKey, publishedLabel, RETENTION_DAYS, shiftDate, todayKey, updateLabel } from './dates';
import { Icon } from './icons';
import { MAX_SCORE, newsRating, RATING_AXES } from './rating';
import { useResource } from './useResource';
import { version } from '../package.json';

const editionName = '一日之计';

const jumpToTop = () => window.scrollTo(0, 0);

function useNow() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = window.setInterval(update, 30_000);
    document.addEventListener('visibilitychange', update);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, []);
  return now;
}

function Header({ date, title, back, other = 'about' }: { date?: string; title?: string; back?: string; other?: 'about' | 'history' }) {
  const location = useLocation();
  const navigate = useNavigate();
  const from = `${location.pathname}${location.search}`;
  const otherLink = <Link className="nav-link" to={`/${other}`} state={{ from }}>{other === 'about' ? '关于' : '历史'}</Link>;
  return <header className="topbar">
    {back ? <div className="shell topbar-content inner-bar">
      <Link className="nav-link back-link" to={back} onClick={(event) => {
        if (location.state?.from === back && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
          event.preventDefault(); navigate(-1);
        }
      }}><Icon name="back" />返回</Link>
      <span className="topbar-title">{title}</span>
      {otherLink}
  </div> : <div className="shell topbar-content">
      <div className="wordmark"><strong>{editionName}</strong>{date && <time dateTime={date}>{dateLabel(date)}</time>}</div>
      <nav className="topbar-nav" aria-label="主导航"><Link className="nav-link" to="/history" state={{ from }}>历史</Link>{otherLink}</nav>
    </div>}
  </header>;
}

function SectionTabs({ section, select }: { section: SectionId; select: (section: SectionId) => void }) {
  function handleKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? 1 :
      ['ArrowLeft', 'ArrowRight'].includes(event.key) ? 1 - index : -1;
    if (target === -1) return;
    event.preventDefault();
    const id = SECTIONS[target].id;
    select(id);
    document.getElementById(`tab-${id}`)?.focus();
  }
  return <div role="tablist" aria-label="新闻板块" className="tabs">{SECTIONS.map(({ id, title }, index) =>
      <button key={id} type="button" className={`tab tab-${id}`} id={`tab-${id}`} role="tab" aria-selected={id === section}
      aria-controls={`panel-${id}`} tabIndex={id === section ? 0 : -1} onClick={() => select(id)} onKeyDown={(event) => handleKey(event, index)}>
      <span className="tab-edition" aria-hidden="true">{index === 0 ? 'A' : 'B'}</span>{title}</button>,
  )}</div>;
}

function NewsGallery({ images }: { images: NewsImage[] }) {
  const [failed, setFailed] = useState<string[]>([]);
  const visible = images.filter(({ url }) => !failed.includes(url));
  if (!visible.length) return null;
  return <div className="news-gallery">
    {IS_MOCK && <p className="gallery-label">本报插图</p>}
    <div className={`gallery-grid${visible.length === 1 ? ' single-image' : ''}${IS_MOCK ? ' demo-illustrations' : ''}`}>
      {visible.map(({ url, alt, caption, credit }, index) => <figure className="news-image" key={url}>
        <div className="image-frame"><img src={url} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed((previous) => [...previous, url])} /></div>
        {(caption || credit || IS_MOCK) && <figcaption>{IS_MOCK && <span className="figure-index">图 {index + 1}</span>}{[caption, credit].filter(Boolean).join(' · ')}</figcaption>}
      </figure>)}
    </div>
  </div>;
}

function NewsCard({ item, now, zone, index }: { item: NewsItem; now: number; zone: string; index: number }) {
  const rating = newsRating(item.editorial_score, item.importance);
  const [ratingOpen, setRatingOpen] = useState(false);
  const ratingId = useId();
  const scoreLabel = rating?.kind === 'importance' ? '重要性' : '信息评分';
  return <article className="news">
    <div className="news-heading"><span className="story-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><h2 className="news-title">{item.title}</h2>
      {rating ? <button className="rating-stamp" type="button" aria-expanded={ratingOpen} aria-controls={ratingId}
        aria-label={`${scoreLabel} ${rating.value.toFixed(1)} 分，满分 ${MAX_SCORE.toFixed(1)} 分`} onClick={() => setRatingOpen((open) => !open)}>
        <span className="rating-value"><strong>{rating.value.toFixed(1)}</strong><small> / {MAX_SCORE.toFixed(1)}</small></span>
        <span className="rating-label">{scoreLabel}<Icon name="down" size={11} /></span>
      </button> : <span className="rating-stamp rating-unset">待评分</span>}
    </div>
    {rating && <div className="rating-details" id={ratingId} hidden={!ratingOpen}>
      {rating.kind === 'weighted' ? <>
        <p>{IS_MOCK ? '演示评分。' : ''}按以下五项加权，评的是阅读价值，不是对真实性的保证，也不代表热度。</p>
        <dl>{RATING_AXES.map(({ id, label, weight, description }) => <div className="rating-axis" key={id}>
          <dt><strong>{label}</strong><small>{description}</small></dt><dd>{rating.axes[id].toFixed(1)} <small>· {weight}%</small></dd>
        </div>)}</dl>
        {rating.capped && <p>核心证据不足，总分上限为 2.0。</p>}
      </> : <p>该简报仅提供 1–5 级重要性，尚无五项评分明细。重要性不代表事实可信度。</p>}
    </div>}
    {item.what_happened && <NewsCopy title="发生了什么" text={item.what_happened} limit={150} />}
    {item.possible_impact && <NewsCopy title="可能的影响" text={item.possible_impact} limit={100} />}
    {item.uncertainty_note && <div className="uncertainty"><span className="badge"><Icon name="warning" size={13} />尚未证实</span><p>{item.uncertainty_note}</p></div>}
    {!!item.images?.length && <NewsGallery images={item.images} />}
    <div className="news-meta">{item.source_name}{item.published_at && <> <span aria-hidden="true">·</span> <time dateTime={item.published_at}>{publishedLabel(item.published_at, zone, now)}</time></>}</div>
    {item.source_url ? <a className="article-link" href={item.source_url} target="_blank" rel="noopener noreferrer"
      aria-label={`阅读原文（新标签页）：${item.title}`}>阅读原文<Icon name="external" /></a> :
      <button type="button" className="article-link is-disabled" disabled><span>阅读原文</span><span>原文链接不可用</span></button>}
    {!!item.supporting_sources?.length && <details className="news-meta"><summary>佐证来源</summary><ul>
      {item.supporting_sources.map((source) => <li key={source.source_url}><a href={source.source_url} target="_blank" rel="noopener noreferrer">{source.source_name}</a>
        {source.published_at && <> <span aria-hidden="true">·</span> <time dateTime={source.published_at}>{publishedLabel(source.published_at, zone, now)}</time></>}</li>)}
    </ul></details>}
  </article>;
}

function EditionCover({ date, title }: { date: string; title: string }) {
  const weekday = new Intl.DateTimeFormat('zh-CN', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
  return <div className="edition-cover">
    <div className="edition-imprint"><span lang="en">Morning Edition</span><span>晨间版</span></div>
    <h1 className="masthead"><span className="masthead-name">{editionName}</span><span className="masthead-subtitle">{title}</span></h1>
    <div className="edition-dateline">
      <time dateTime={date}>{dateLabel(date, true)} <span className="edition-weekday">{weekday}</span></time>
      {IS_MOCK && <span className="demo-label">演示数据</span>}
      <span className="edition-update">计划 08:30 推送</span>
    </div>
  </div>;
}

function NewsCopy({ title, text, limit }: { title: string; text: string; limit: number }) {
  const characters = Array.from(text);
  const excerpt = characters.length > limit ? `${characters.slice(0, limit - 1).join('').trimEnd()}…` : text;
  const [first, ...rest] = excerpt.split(/\n\s*\n/u);
  return <div className="news-copy"><h3>{title}</h3><p>{first}</p>{rest.length > 0 && <p>{rest.join('\n')}</p>}</div>;
}

function Skeleton() {
  return <div role="status" aria-label="正在加载简报" className="skeleton-list">{[0, 1, 2].map((index) => <div className="skeleton" key={index} aria-hidden="true">
    <i /><i /><i /><i />
  </div>)}</div>;
}

function Notice({ title, description, icon = 'page', children }: { title: string; description?: string; icon?: 'page' | 'offline' | 'warning'; children?: ReactNode }) {
  return <div className="notice"><span className="notice-icon"><Icon name={icon} size={21} /></span>
    <p role="status" className="notice-text"><strong>{title}</strong>{description && <span>{description}</span>}</p>
    {children && <div className="notice-actions">{children}</div>}
  </div>;
}

function Refresh({ onClick, children = '刷新' }: { onClick: () => void; children?: ReactNode }) {
  return <button type="button" className="action" onClick={onClick}><Icon name="refresh" />{children}</button>;
}

function SignInNotice() {
  const [failed, setFailed] = useState(false);
  if (IS_IOS_BUILD) return <Notice icon="warning" title="连接私人简报" description={failed ? '无法保存设置，请重试。' : '首次打开时，需在手机上配置只读访问。'}>
    <Refresh onClick={() => { setFailed(false); void configurePrivateAccess().catch(() => setFailed(true)); }}>配置访问</Refresh>
  </Notice>;
  return <Notice icon="warning" title="请重新登录" description="此简报仅限获授权的账号阅读。">
    <Refresh onClick={() => window.location.reload()}>重新登录</Refresh>
  </Notice>;
}

function BriefScreen({ date, home, now, back }: { date: string; home: boolean; now: number; back: string }) {
  const [section, setSection] = useState<SectionId>('ai');
  const { state, reload, attempt } = useResource(date, (signal) => loadBrief(date, signal, home), () => readBrief(date) ?? (home ? latestBrief(date) : undefined));
  const brief = state.phase === 'ready' ? state.value : undefined;
  const shownDate = brief?.date ?? date;
  const outdated = !!(home && brief?.generated_at && now - Date.parse(brief.generated_at) > 36 * 3_600_000);
  const select = (next: SectionId) => { if (next !== section) { setSection(next); jumpToTop(); } };
  const unavailable = state.phase === 'failed' && state.reason === 'missing';
  useEffect(() => { document.title = `${home ? '今日简报' : dateLabel(date)} · ${editionName}`; }, [date, home]);

  function content(sectionId: SectionId) {
    if (state.phase === 'loading') return <Skeleton />;
    if (state.phase === 'slow') return <Notice title="加载中…"><Refresh onClick={reload} /></Notice>;
    if (state.phase === 'failed') {
      if (state.reason === 'auth') return <SignInNotice />;
      if (state.reason === 'missing') return home ? <Notice title="暂无新闻" description="今天的简报还没有发布。"><Refresh onClick={reload} /></Notice> :
        <Notice title="无数据" description="这一天暂无简报数据。"><Link className="action" to={back}>返回历史日期列表</Link></Notice>;
      if (state.reason === 'offline') return <Notice icon="offline" title="离线模式" description="你目前处于离线状态，无法加载新闻。请检查网络连接。"><Refresh onClick={reload}>重试</Refresh></Notice>;
      return <Notice icon="warning" title={state.reason === 'format' ? '数据格式错误' : home ? '无法加载新闻' : '无法加载这天的简报'}
        description={state.reason === 'format' ? '暂时无法读取简报，请稍后重试。' : '网络连接出现问题，请检查网络或稍后重试。'}><Refresh onClick={reload}>重试</Refresh></Notice>;
    }
    if (state.phase !== 'ready') return null;
    const items = state.value.sections[sectionId];
    const incomplete = state.value.sectionNotices?.[sectionId] === 'source_coverage_incomplete';
    if (!items.length && incomplete) return <Notice icon="warning" title="来源覆盖不完整" description="该板块部分来源未能采集或核验，暂时没有可展示的新闻。" />;
    if (!items.length) return <Notice title="暂无新闻" description={shownDate === todayKey(now) ? '今天这个板块还没有重要新闻。' : '这天的这个板块没有重要新闻。'}>
      {home && attempt > 0 && !state.offline && <span className="next-update">计划推送时间：每天 08:30</span>}
      <Refresh onClick={reload} />
    </Notice>;
    return <div className="news-list">
      {incomplete && <div className="banner warn" role="status">部分来源未能采集或核验。</div>}
      <div className="section-caption"><span>{sectionId === 'ai' ? '人工智能与科技' : '国际与经济'}</span><span className="section-count">本期 {items.length} 条</span></div>
      {items.map((item, index) => <NewsCard key={`${item.id}-${index}`} item={item} index={index} now={now} zone={state.value.timezone} />)}
    </div>;
  }

  return <>
    <Header date={home ? shownDate : undefined} back={home ? undefined : back} title={dateLabel(shownDate)} />
    <main className="shell main scene" id="main">
      <EditionCover date={shownDate} title={home ? shownDate === date ? '今日简报' : state.phase === 'ready' && state.offline ? '缓存简报' : '最近一期' : '往期简报'} />
      {state.phase === 'ready' && state.offline && <div className="banner" role="status"><Icon name="offline" /><div><strong>离线模式</strong><p>正在显示 {dateLabel(shownDate)}的缓存简报。恢复网络后会自动更新。</p></div></div>}
      {outdated && brief?.generated_at && <div className="banner warn" role="status"><Icon name="warning" /><div>数据已过期，最后更新于 {updateLabel(brief.generated_at, brief.timezone)}</div><Refresh onClick={reload} /></div>}
      {unavailable ? content(section) : <><SectionTabs section={section} select={select} />
        {SECTIONS.map(({ id }) => <div key={id} id={`panel-${id}`} role="tabpanel" aria-labelledby={`tab-${id}`} tabIndex={id === section ? 0 : -1} hidden={id !== section}>
          {id === section && <div className="panel-enter">{content(id)}</div>}
        </div>)}
      </>}
    </main>
  </>;
}

function Home({ now }: { now: number }) {
  const [params] = useSearchParams();
  const date = params.get('date');
  if (date !== null && !isDateKey(date)) return <><Header back="/" title="日期无效" /><main id="main" className="shell main"><Notice title="日期无效" description="请使用 YYYY-MM-DD 格式打开简报。"><Link className="action" to="/">返回首页</Link></Notice></main></>;
  if (date !== null && !inRetention(date, todayKey(now))) return <UnavailableDate back="/history" />;
  return <BriefScreen key={date ?? todayKey(now)} date={date ?? todayKey(now)} now={now} home={date === null} back="/history" />;
}

function UnavailableDate({ back }: { back: string }) {
  return <><Header back={back} title="简报不可用" /><main id="main" className="shell main"><Notice title="此日期不在保留范围内" description="仅保留最近七天的简报。"><Link className="action" to={back}>返回历史简报</Link></Notice></main></>;
}

function HistoricalBrief({ now }: { now: number }) {
  const { date } = useParams();
  const back = '/history';
  if (!isDateKey(date)) return <><Header back={back} title="日期无效" /><main id="main" className="shell main"><Notice title="日期无效"><Link className="action" to={back}>返回历史日期列表</Link></Notice></main></>;
  if (!inRetention(date, todayKey(now))) return <UnavailableDate back={back} />;
  return <BriefScreen key={date} date={date} home={false} now={now} back={back} />;
}

function History({ now }: { now: number }) {
  const today = todayKey(now);
  const start = shiftDate(today, 1 - RETENTION_DAYS);
  const { state, reload } = useResource(`${today}:${start}`, (signal) => loadHistory(today, start, signal), () => readHistory(today, start));
  const entries = state.phase === 'ready' ? state.value : readHistory(today, start);
  useEffect(() => { document.title = `历史简报 · ${editionName}`; }, []);
  return <><Header back="/" title="历史简报" /><main id="main" className="shell main scene">
    <div className="page-intro"><h1>历史简报</h1><p>仅保留最近七天，按北京时间计算。</p></div>
    {state.phase === 'ready' && state.offline && <div className="banner" role="status"><Icon name="offline" />离线模式 · 正在显示已缓存的日期列表。</div>}
    {state.phase === 'failed' && state.reason === 'auth' ? <SignInNotice /> : state.phase === 'failed' ? <Notice icon={state.reason === 'offline' ? 'offline' : 'warning'} title={state.reason === 'offline' ? '离线模式' : '无法加载历史'}
      description={state.reason === 'offline' ? '目前没有缓存的历史日期。' : '暂时无法获取历史日期，请稍后重试。'}><Refresh onClick={reload}>重试</Refresh></Notice> : <>
      {!!entries?.length && <ul className="date-list" aria-label="简报日期">{entries.map(({ date, available }) => {
        const label = <>{dateLabel(date, date.slice(0, 4) !== today.slice(0, 4))}{date === today && <span className="today-tag">（今天）</span>}</>;
        if (available) return <li key={date}><Link className={`date-row${date === today ? ' today' : ''}`} to={`/history/${date}`}>
          <time dateTime={date}>{label}</time><Icon name="next" />
        </Link></li>;
        return <li key={date}><div className={`date-row unavailable${date === today ? ' today' : ''}`}><time dateTime={date}>{label}</time><span>{state.phase === 'loading' || state.phase === 'slow' ? '确认中…' : state.phase === 'ready' && state.offline ? '暂无缓存' : '未生成'}</span></div></li>;
      })}</ul>}
      {state.phase === 'loading' && (!entries ? <Skeleton /> : <p className="history-progress" role="status">正在加载日期…</p>)}
      {state.phase === 'slow' && <Notice title="加载中…"><Refresh onClick={reload} /></Notice>}
    </>}
  </main></>;
}

function safariInstall() {
  const { userAgent } = navigator;
  return /iPhone.*Version\/[\d.]+.*Safari\//i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(userAgent) &&
    !(navigator as Navigator & { standalone?: boolean }).standalone && !matchMedia('(display-mode: standalone)').matches;
}

function About() {
  const location = useLocation();
  const from = location.state?.from;
  const back = typeof from === 'string' && /^\/(?!\/)(?!about(?:$|\?))/.test(from) ? from : '/';
  const latest: Brief | undefined = latestBrief();
  useEffect(() => { document.title = `关于 · ${editionName}`; }, []);
  return <><Header back={back} other="history" title="关于" /><main id="main" className="shell main scene about">
    <div className="about-brand"><img width="128" height="128" src={`${import.meta.env.BASE_URL}brand/morning.svg`} alt="" /><h1>{editionName}</h1><p>v{version}</p></div>
    <section className="about-group"><h2>推送时间</h2><p>计划每天北京时间 08:30 推送。</p>{latest?.generated_at && <p className="secondary">最后更新于 {updateLabel(latest.generated_at, latest.timezone)}</p>}
      <h2>覆盖时间范围</h2><p>前一天 08:00 至当天 08:00（北京时间）。</p>
      {latest && <p className="secondary">{latest.coverage_start && latest.coverage_end ? `最近简报：${updateLabel(latest.coverage_start, latest.timezone)} 至 ${updateLabel(latest.coverage_end, latest.timezone)}` : '最近简报的时间范围未知。'}</p>}</section>
    <section className="about-group"><h2>信息来源</h2><p>新闻由多个来源汇总、去重并精选，每条新闻注明来源。原文链接可用时，可直接打开核对。</p></section>
    <section className="about-group"><h2>使用条款与隐私</h2><details><summary>查看使用与隐私说明</summary><p>这是一份个人用的每日新闻简报，不提供推送设置，不内置分析或追踪脚本。</p><p>{IS_PRIVATE_BUILD ? '正式简报仅限获授权的账号在线阅读，不会保存为本机离线缓存。' : '为支持离线阅读，浏览器在本机保存读过的简报和历史日期。你可以清除站点数据删除缓存。'}打开原文后，由来源站点适用其自己的使用和隐私政策。</p><p>简报为阅读参考，请以原文为准。</p></details></section>
    <section className="about-group"><p>只展示真正重要的新闻，适合在清晨快速读完。</p>{IS_MOCK && <p className="secondary">当前使用演示数据，不代表真实新闻或来源。</p>}</section>
    {safariInstall() && <section className="about-group"><h2>添加到主屏幕</h2><p className="install-hint"><Icon name="share" />在 Safari 分享菜单中选择「添加到主屏幕」。若有「作为网页 App 打开」选项，将它关闭，即可用 Safari 打开。</p></section>}
  </main></>;
}

function Site() {
  const { pathname, search } = useLocation();
  const now = useNow();
  const today = todayKey(now);
  useLayoutEffect(() => {
    jumpToTop();
    const main = document.getElementById('main');
    if (main) { main.tabIndex = -1; main.focus({ preventScroll: true }); }
  }, [pathname]);
  useEffect(() => { pruneCache(); }, [today]);
  return <><a className="skip-link" href="#main" onClick={IS_IOS_BUILD ? (event) => { event.preventDefault(); document.getElementById('main')?.focus(); } : undefined}>跳到内容</a><Routes>
    <Route path="/" element={<Home key={search} now={now} />} />
    <Route path="/history" element={<History now={now} />} />
    <Route path="/history/:date" element={<HistoricalBrief now={now} />} />
    <Route path="/briefs/:date" element={<HistoricalBrief now={now} />} />
    <Route path="/about" element={<About />} />
    <Route path="*" element={<><Header back="/" title="找不到页面" /><main id="main" className="shell main"><Notice title="找不到页面"><Link className="action" to="/">返回首页</Link></Notice></main></>} />
  </Routes></>;
}

export default function App() {
  if (IS_IOS_BUILD) return <HashRouter><Site /></HashRouter>;
  return <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}><Site /></BrowserRouter>;
}
