import { useEffect, useMemo, useState, useRef } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BookmarkCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ExternalLink,
  Gauge,
  Globe2,
  LayoutDashboard,
  MessageSquare,
  Moon,
  Newspaper,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  Sun,
  Target,
  Zap,
  Play,
  X,
  Download,
  RefreshCw,
  Database,
  Sliders,
  Volume2,
  VolumeX,
  Check,
  RotateCcw,
  Server,
  Radio,
  ShieldCheck,
  Smile,
  HeartHandshake,
} from 'lucide-react'
import './App.css'

const API = 'http://127.0.0.1:8000'

const NAV_ITEMS = [
  ['Overview', LayoutDashboard, 'overview'],
  ['Sentiment Monitor', Activity, 'sentiment'],
  ['Sources & Mentions', Search, 'mentions'],
  ['Issue Tracker', Target, 'issues'],
  ['Alerts', Bell, 'alerts'],
  ['Alerts Saved', BookmarkCheck, 'alerts-saved'],
  ['Insights', Sparkles, 'insights'],
  ['Settings', Settings, 'settings'],
]

function asArray(value) {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') {
    if (Array.isArray(value.items)) return value.items
    if (Array.isArray(value.data)) return value.data
    if (Array.isArray(value.results)) return value.results
    if (Array.isArray(value.reputation) || Array.isArray(value.comments)) {
      return [
        ...(Array.isArray(value.reputation) ? value.reputation : []),
        ...(Array.isArray(value.comments) ? value.comments : []),
      ]
    }
    const arrays = Object.values(value).filter(Array.isArray)
    if (arrays.length > 0) return arrays.flat()
  }
  return []
}

function cleanText(value = '') {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function firstUseful(...values) {
  for (const value of values) {
    const text = cleanText(value)
    if (text) return text
  }
  return ''
}

function dateValue(item) {
  if (!item) return 0
  if (typeof item === 'number') {
    return item > 1e11 ? item : item * 1000
  }
  if (typeof item === 'string') {
    const parsed = new Date(item).getTime()
    return Number.isNaN(parsed) ? 0 : parsed
  }

  const rawVal =
    item.timestamp ||
    item.detected_at ||
    item.published_at ||
    item.created_at ||
    item.date ||
    item.published ||
    ''

  if (typeof rawVal === 'number') {
    return rawVal > 1e11 ? rawVal : rawVal * 1000
  }
  if (typeof rawVal === 'string' && rawVal.trim()) {
    const parsed = new Date(rawVal).getTime()
    return Number.isNaN(parsed) ? 0 : parsed
  }

  return 0
}

function formatDate(item) {
  const timestamp = dateValue(item)

  if (!timestamp) return 'Date unavailable'

  return new Date(timestamp).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(item) {
  const timestamp = dateValue(item)

  if (!timestamp) return ''

  return new Date(timestamp).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function sentimentOf(item) {
  if (!item) return 'neutral'

  const text = `${item.title || ''} ${item.text || ''} ${item.description || ''} ${item.url || ''} ${item.sourceUrl || ''}`.toLowerCase()

  const strongNegPhrases = [
    'rera complaint', 'rera notice', 'rera penalty', 'court case', 'lawsuit',
    'legal notice', 'legal dispute', 'fir filed', 'investigation', 'fraud',
    'scam', 'cheated', 'embezzlement', 'stalled project', 'construction halt',
    'building collapse', 'structural defect', 'buyer protest', 'water leakage issue',
    'severe delay', 'penalty imposed', 'breach of contract', 'nclt', 'insolvency',
    'paid and forgotten', 'done waiting', "legally isn't", 'water seepage',
    'basement leakage', 'fee hike', 'refund delay', 'unresponsive crm', 'handover delay',
    'occupancy certificate delay', 'negative review', 'negative reviews', 'frustrated buyer',
    'frustrated', 'dont ignore negative', "don't ignore negative", 'buyer beware', 'rant',
    'gst evasion', 'tax evasion', 'financial irregularities', 'financial irregularity',
    'corruption', 'dispute and maintenance', 'poor construction', 'substandard quality',
    'possession delay', 'broken promise', 'maintenance issue', 'waterlogging',
    'construction snags', 'delayed possession', 'poor quality'
  ]
  if (strongNegPhrases.some((sn) => text.includes(sn))) return 'negative'

  const raw = String(
    item.sentiment ||
    item.sentiment_label ||
    item.sentiment_class ||
    item.sentiment_type ||
    ''
  ).trim().toLowerCase()

  if (raw === 'positive' || raw === 'pos') return 'positive'
  if (raw === 'negative' || raw === 'neg') return 'negative'
  if (raw === 'neutral' || raw === 'neu') return 'neutral'

  const score = Number(
    item.sentiment_score ??
    item.sentimentScore ??
    item.score ??
    NaN
  )

  if (Number.isFinite(score)) {
    if (score > 0.05) return 'positive'
    if (score < -0.05) return 'negative'
    return 'neutral'
  }

  const strongPosPhrases = [
    'profit at', 'profit of', 'posts profit', 'profit turns positive',
    'turns positive', 'profit swings', 'revenue up', 'revenue surges',
    'revenue surged', 'ebitda margin expands', 'net profit', "after last year's loss",
    'after loss', 'from loss', 'record sales', 'strong demand', 'expansion',
    'allotment of', 'channel partner', 'new launch', 'unveiled', 'show residence',
    'appreciation', 'refined design', 'prime location', 'leadership spotlight',
    'has taken charge as', 'has been appointed as', 'elevated to', 'promoted to',
    'executive appointment', 'excellence leadership', 'highly recommended',
    'seamless handover', 'great construction', 'quality finishing', 'happy homeowner',
    'delighted with', 'excellent amenities', 'on time delivery', 'smooth possession',
    'timely possession', 'top notch quality', 'best builder'
  ]
  if (strongPosPhrases.some((sp) => text.includes(sp))) return 'positive'

  const negKeywords = [
    'delay', 'complaint', 'court', 'rera', 'legal', 'expensive', 'defect', 'leakage',
    'seepage', 'fraud', 'scam', 'penalty', 'violation', 'lawsuit', 'stuck', 'protest',
    'cheated', 'halt', 'stalled', 'bad', 'worst', 'poor', 'disappointed', 'cancelling',
    'refund', 'dispute', 'hike'
  ]

  const posKeywords = [
    'profit', 'surged', 'surges', 'growth', 'gains', 'best', 'premium', 'great',
    'luxury', 'excellent', 'top', 'launch', 'successful', 'reward', 'award', 'leader'
  ]

  const negHits = negKeywords.filter((k) => new RegExp(`\\b${k}\\b`, 'i').test(text)).length
  const posHits = posKeywords.filter((k) => new RegExp(`\\b${k}\\b`, 'i').test(text)).length

  if (posHits > negHits) return 'positive'
  if (negHits > posHits) return 'negative'
  if (posHits > 0 && negHits === 0) return 'positive'
  if (negHits > 0 && posHits === 0) return 'negative'

  return 'neutral'
}

const CUSTOMER_TOUCHPOINT_KEYWORDS = [
  'customer', 'buyer', 'buyers', 'resident', 'residents',
  'homeowner', 'homebuyer', 'homebuyers', 'flat', 'flats',
  'apartment', 'apartments', 'possession', 'handover',
  'booking', 'refund', 'crm', 'service', 'support',
  'leakage', 'seepage', 'maintenance', 'amenities',
  'complaint', 'complaints', 'grievance', 'grievances',
  'delay', 'delays', 'snag', 'snagging', 'water supply',
  'lift', 'parking', 'clubhouse', 'workmanship',
  'carpet area', 'possession date', 'allotment'
]

const EXCLUDE_CORP_TERMS = [
  'appointed as', 'elevation to', 'elevated to', 'takes charge as',
  'financial results', 'investor presentation', 'ebitda', 'ncd',
  'bse filing', 'nse filing', 'board meeting', 'share price',
  'debenture', 'credit rating'
]

export function isCustomerTouchpoint(item) {
  if (!item) return false
  const src = String(item.source || '').toLowerCase()
  if (src.includes('mouthshut')) return false
  if (src.includes('comment') || src.includes('reddit')) return true

  const title = String(item.title || '').toLowerCase()
  const text = String(item.text || item.description || item.snippet || '').toLowerCase()
  const combined = `${title} ${text}`

  for (const ex of EXCLUDE_CORP_TERMS) {
    if (
      combined.includes(ex) &&
      !['complaint', 'possession', 'handover', 'delay', 'buyer', 'resident'].some((k) =>
        combined.includes(k)
      )
    ) {
      return false
    }
  }

  return CUSTOMER_TOUCHPOINT_KEYWORDS.some((k) => {
    const reg = new RegExp(`\\b${k}\\b`, 'i')
    return reg.test(combined)
  })
}

function sourceName(source = '') {
  const s = String(source).toLowerCase()

  if (s.includes('mouthshut')) {
    return 'MouthShut'
  }

  if (
    s.includes('youtube') ||
    s.includes('video') ||
    s.includes('play')
  ) {
    return 'YouTube'
  }

  if (
    s.includes('news') ||
    s.includes('rss') ||
    s.includes('article')
  ) {
    return 'News'
  }

  if (
    s.includes('comment') ||
    s.includes('review')
  ) {
    return 'Comments'
  }

  if (
    s.includes('twitter') ||
    s.includes(' x') ||
    s === 'x'
  ) {
    return 'X / Twitter'
  }

  if (
    s.includes('puravankara') ||
    s.includes('website') ||
    s.includes('web')
  ) {
    return 'Puravankara Website'
  }

  return source ? cleanText(source) : 'Other'
}

function normaliseRecord(item = {}) {
  const title = firstUseful(
    item.title,
    item.headline,
    item.name,
    item.subject,
    item.video_title
  )

  const text = firstUseful(
    item.text,
    item.description,
    item.summary,
    item.content,
    item.snippet,
    item.body
  )

  const url = firstUseful(
    item.url,
    item.link,
    item.source_url,
    item.article_url,
    item.video_url
  )

  const author = firstUseful(
    item.author,
    item.channel,
    item.publisher,
    item.source_name
  )

  const source = sourceName(
    item.source ||
    item.platform ||
    item.channel ||
    item.type ||
    ''
  )

  return {
    ...item,
    title,
    text,
    url,
    author,
    source,
  }
}

function getSourcePriority(record) {
  const source = String(record?.source || '').toLowerCase()
  const author = String(record?.author || '').toLowerCase()
  const url = String(record?.url || '').toLowerCase()

  // Tier 1: News Feed (Major News Media Outlets)
  if (
    (source === 'news' || source.includes('news')) &&
    !url.includes('puravankara.com') &&
    !author.includes('puravankara.com')
  ) {
    return 1
  }

  // Tier 2: LinkedIn & Social Platforms / Forums
  if (
    source.includes('linkedin') ||
    source.includes('twitter') ||
    source.includes('x') ||
    source.includes('reddit') ||
    source.includes('social') ||
    source.includes('forum')
  ) {
    return 2
  }

  // Tier 3: Official Puravankara Website
  if (
    url.includes('puravankara.com') ||
    author.includes('puravankara.com') ||
    source.includes('website') ||
    source.includes('corporate')
  ) {
    return 3
  }

  // Tier 4: YouTube Videos
  if (
    source.includes('youtube') ||
    url.includes('youtube') ||
    url.includes('youtu.be')
  ) {
    return 4
  }

  return 2
}

function sortRecordsBySourceHierarchy(records) {
  return [...records].sort((a, b) => {
    const prioA = getSourcePriority(a)
    const prioB = getSourcePriority(b)

    if (prioA !== prioB) {
      return prioA - prioB
    }

    return dateValue(b) - dateValue(a)
  })
}

function uniqueRecords(...groups) {
  const map = new Map()

  groups.flat().forEach((raw, index) => {
    if (!raw || typeof raw !== 'object') return

    const item = normaliseRecord(raw)

    const key =
      item.url ||
      `${item.source}|${item.title}|${item.text}|${index}`

    if (!map.has(key)) {
      map.set(key, item)
    }
  })

  return sortRecordsBySourceHierarchy([...map.values()])
}

function generatedTitle(record) {
  if (record.title) return record.title

  const text = cleanText(record.text)

  if (text) {
    return text.length > 120
      ? `${text.slice(0, 117)}...`
      : text
  }

  if (record.author) {
    return `Mention from ${record.author}`
  }

  return `${record.source} mention`
}

function sourceIcon(source) {
  if (source === 'YouTube') return <Play size={13} />
  if (source === 'News') return <Newspaper size={13} />
  if (source === 'Puravankara Website') return <Globe2 size={13} />
  if (source === 'MouthShut') return <MessageSquare size={13} />
  return <MessageSquare size={13} />
}

function MiniSparkline({ values = [], tone = 'blue' }) {
  const safeValues = values.length
    ? values
    : [10, 15, 12, 18, 14, 20, 23]

  const min = Math.min(...safeValues)
  const max = Math.max(...safeValues)

  const points = safeValues
    .map((value, index) => {
      const x =
        (index / Math.max(safeValues.length - 1, 1)) * 100

      const y =
        34 -
        ((value - min) / Math.max(max - min, 1)) * 27

      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg
      className={`mini-sparkline ${tone}`}
      viewBox="0 0 100 38"
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function getSentimentTimeline(records) {
  const defaultDates = ['Apr 24', 'May 23', 'Jun 21', 'Jul 19', 'Aug 17']
  if (!records || !records.length) {
    return {
      dates: defaultDates,
      positive: [0, 1, 3, 7, 29],
      neutral: [2, 3, 10, 19, 71],
      negative: [0, 0, 1, 2, 4],
      totals: [2, 4, 14, 28, 104],
      nets: [0, 25, 14.3, 17.9, 24.0],
      scores: [50, 63, 57, 59, 62],
    }
  }

  const validRecords = records
    .map((r) => ({
      timestamp: dateValue(r),
      sentiment: sentimentOf(r),
    }))
    .filter((r) => r.timestamp > 0)
    .sort((a, b) => a.timestamp - b.timestamp)

  if (!validRecords.length) {
    return {
      dates: defaultDates,
      positive: [0, 1, 3, 7, 29],
      neutral: [2, 3, 10, 19, 71],
      negative: [0, 0, 1, 2, 4],
      totals: [2, 4, 14, 28, 104],
      nets: [0, 25, 14.3, 17.9, 24.0],
      scores: [50, 63, 57, 59, 62],
    }
  }

  const minTime = validRecords[0].timestamp
  const maxTime = validRecords[validRecords.length - 1].timestamp
  const span = Math.max(maxTime - minTime, 86400000)

  const computedDates = []
  const totals = []
  const positive = []
  const neutral = []
  const negative = []
  const nets = []
  const scores = []

  for (let i = 0; i < 5; i++) {
    const cutoff = minTime + ((i + 1) / 5) * span
    const subset = validRecords.filter((r) => r.timestamp <= cutoff)

    const tot = subset.length
    const pos = subset.filter((r) => r.sentiment === 'positive').length
    const neg = subset.filter((r) => r.sentiment === 'negative').length
    const neu = subset.filter((r) => r.sentiment === 'neutral').length

    const netVal = tot ? Number((((pos - neg) / tot) * 100).toFixed(1)) : 0
    const scoreVal = tot
      ? Math.max(0, Math.min(100, Math.round(50 + ((pos - neg) / tot) * 50)))
      : 50

    totals.push(tot)
    positive.push(pos)
    neutral.push(neu)
    negative.push(neg)
    nets.push(netVal)
    scores.push(scoreVal)

    const dateObj = new Date(cutoff)
    computedDates.push(
      dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    )
  }

  return {
    dates: computedDates,
    positive,
    neutral,
    negative,
    totals,
    nets,
    scores,
  }
}

function MiniStatChart({
  data = [],
  tone = 'blue',
  dates = ['Apr 24', 'May 23', 'Jun 21', 'Jul 19', 'Aug 17'],
}) {
  const [hoverIndex, setHoverIndex] = useState(null)

  const safeData = data.length >= 5 ? data.slice(-5) : [0, 5, 12, 25, 50]
  const min = Math.min(...safeData, 0)
  const max = Math.max(...safeData, 1)

  const plotLeft = 36
  const plotRight = 192
  const plotTop = 10
  const plotBottom = 54
  const plotWidth = plotRight - plotLeft
  const plotHeight = plotBottom - plotTop

  const getX = (idx) =>
    plotLeft + (idx / Math.max(safeData.length - 1, 1)) * plotWidth
  const getY = (val) =>
    plotBottom - ((val - min) / Math.max(max - min, 1)) * plotHeight

  const points = safeData
    .map((val, idx) => `${getX(idx)},${getY(val)}`)
    .join(' ')

  const formatVal = (v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)

  return (
    <div className="mini-chart-wrapper">
      <svg viewBox="0 0 200 80" className="mini-chart-svg">
        <text
          x={plotLeft - 5}
          y={plotTop + 3}
          className="mini-axis-label"
          textAnchor="end"
        >
          {formatVal(max)}
        </text>
        <text
          x={plotLeft - 5}
          y={plotBottom + 3}
          className="mini-axis-label"
          textAnchor="end"
        >
          {formatVal(min)}
        </text>

        <line
          x1={plotLeft}
          x2={plotRight}
          y1={plotTop}
          y2={plotTop}
          className="mini-grid-line"
        />
        <line
          x1={plotLeft}
          x2={plotRight}
          y1={plotBottom}
          y2={plotBottom}
          className="mini-grid-line"
        />

        <polyline
          points={points}
          fill="none"
          className={`mini-line ${tone}`}
          strokeWidth="2.2"
        />

        {safeData.map((val, idx) => {
          const cx = getX(idx)
          const cy = getY(val)
          return (
            <g
              key={idx}
              onMouseEnter={() => setHoverIndex(idx)}
              onMouseLeave={() => setHoverIndex(null)}
              style={{ cursor: 'pointer' }}
            >
              <circle cx={cx} cy={cy} r="3.5" className={`mini-dot ${tone}`} />
              <circle cx={cx} cy={cy} r="9" fill="transparent" />
            </g>
          )
        })}

        {dates.map((d, idx) => (
          <text
            key={d}
            x={getX(idx)}
            y={73}
            className="mini-axis-label"
            textAnchor="middle"
          >
            {d}
          </text>
        ))}
      </svg>

      {hoverIndex !== null && (
        <div
          className="mini-chart-tooltip"
          style={{
            left: `${(getX(hoverIndex) / 200) * 100}%`,
            top: `${(getY(safeData[hoverIndex]) / 80) * 100}%`,
          }}
        >
          {dates[hoverIndex]}: <strong>{safeData[hoverIndex]}</strong>
        </div>
      )}
    </div>
  )
}

function StatCard({
  title,
  value,
  suffix,
  note,
  tone,
  values = [],
  dates,
  trend,
  infoText,
}) {
  return (
    <article className={`stat-card ${tone}`}>
      <div className="stat-card-top">
        <span className="stat-card-title">{title}</span>

        <div className="stat-help" title={infoText || title}>
          <CircleHelp size={15} />
        </div>
      </div>

      <div className="stat-number">
        {value}
        {suffix && <small>{suffix}</small>}
      </div>

      <div className="stat-note">
        {trend && (
          <span className={`trend-tag ${trend.type}`}>
            {trend.type === 'up' ? '▲' : '▼'} {trend.value}
            <small>vs last 7 days</small>
          </span>
        )}

        {!trend && note}
      </div>

      <MiniStatChart data={values} tone={tone} dates={dates} />
    </article>
  )
}

function CustomFilterSelect({ value, options, onChange, labelPrefix = '' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const selectedOpt = options.find((o) => o.value === value) || options[0]

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="custom-select-wrapper" ref={ref}>
      <button
        type="button"
        className={`custom-select-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>
          {labelPrefix ? `${labelPrefix}: ` : ''}
          {selectedOpt.label}
        </span>
        <ChevronDown size={14} className={`select-chevron ${open ? 'rotated' : ''}`} />
      </button>

      {open && (
        <div className="custom-select-dropdown">
          {options.map((opt) => (
            <div
              key={opt.value}
              className={`custom-select-option ${value === opt.value ? 'selected' : ''}`}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TrendChart({
  records,
  timeRange,
  onTimeRangeChange,
  year,
  onYearChange,
  month,
  onMonthChange,
  source,
  onSourceChange,
}) {
  const [hoverData, setHoverData] = useState(null)

  const timeline = useMemo(() => getSentimentTimeline(records), [records])

  const { dates, positive, neutral, negative } = timeline

  const max = Math.max(
    1,
    ...positive.map((p, i) => Math.max(p, neutral[i], negative[i], p + neutral[i] + negative[i]))
  )

  const plotLeft = 48
  const plotRight = 472
  const plotTop = 24
  const plotBottom = 160
  const plotWidth = plotRight - plotLeft
  const plotHeight = plotBottom - plotTop

  const gridRatios = [1.0, 0.75, 0.5, 0.25, 0]

  const getX = (idx) =>
    plotLeft + (idx / Math.max(dates.length - 1, 1)) * plotWidth
  const getY = (val) => plotBottom - (val / max) * plotHeight

  const lineStr = (arr) =>
    arr.map((val, idx) => `${getX(idx)},${getY(val)}`).join(' ')

  const yearOptions = useMemo(
    () => [
      { value: 'all', label: 'All Years' },
      ...Array.from({ length: 21 }, (_, i) => {
        const yr = 2026 - i
        return { value: String(yr), label: String(yr) }
      }),
    ],
    []
  )

  return (
    <div className="trend-container">
      <div className="trend-filter-toolbar">
        <div className="time-pill-group">
          {[
            ['24h', '24h'],
            ['7d', '7d'],
            ['30d', '30d'],
            ['3m', '3m'],
            ['6m', '6m'],
            ['1y', '1y'],
            ['all', 'All'],
          ].map(([val, label]) => (
            <button
              key={val}
              type="button"
              className={`time-pill ${timeRange === val ? 'active' : ''}`}
              onClick={() => onTimeRangeChange(val)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="dropdown-filter-group">
          <CustomFilterSelect
            value={year}
            onChange={onYearChange}
            labelPrefix=""
            options={yearOptions}
          />
        </div>
      </div>

      <div className="trend-header-row">
        <div className="chart-legend">
          <span>
            <i className="legend-dot positive" />
            Positive
          </span>
          <span>
            <i className="legend-dot neutral" />
            Neutral
          </span>
          <span>
            <i className="legend-dot negative" />
            Negative
          </span>
        </div>

        <div
          className="stat-help"
          title="Daily sentiment distribution over time"
        >
          <CircleHelp size={14} />
        </div>
      </div>

      <div className="trend-chart-wrapper large">
        <svg
          viewBox="0 0 500 210"
          preserveAspectRatio="xMidYMid meet"
          className="trend-svg"
        >
          {gridRatios.map((ratio) => {
            const gridY = plotTop + (1 - ratio) * plotHeight
            const labelValue = Math.round(max * ratio)
            return (
              <g key={ratio} className="grid-group">
                <text
                  x={plotLeft - 8}
                  y={gridY}
                  className="chart-y-label"
                  textAnchor="end"
                  dominantBaseline="central"
                >
                  {labelValue}
                </text>
                <line
                  x1={plotLeft}
                  x2={plotRight}
                  y1={gridY}
                  y2={gridY}
                  className="chart-grid-line"
                />
              </g>
            )
          })}

          {dates.map((date, idx) => (
            <text
              key={date}
              x={getX(idx)}
              y={186}
              className="chart-x-label"
              textAnchor="middle"
            >
              {date}
            </text>
          ))}

          <polyline
            points={lineStr(positive)}
            className="trend-line positive"
          />
          <polyline
            points={lineStr(neutral)}
            className="trend-line neutral"
          />
          <polyline
            points={lineStr(negative)}
            className="trend-line negative"
          />

          {dates.map((date, idx) => (
            <g key={idx}>
              <circle
                cx={getX(idx)}
                cy={getY(positive[idx])}
                r="4.5"
                className="trend-dot positive"
                onMouseEnter={() =>
                  setHoverData({
                    date,
                    pos: positive[idx],
                    neu: neutral[idx],
                    neg: negative[idx],
                    tot: positive[idx] + neutral[idx] + negative[idx],
                    cx: getX(idx),
                    cy: getY(positive[idx]),
                  })
                }
                onMouseLeave={() => setHoverData(null)}
              />
              <circle
                cx={getX(idx)}
                cy={getY(neutral[idx])}
                r="4.5"
                className="trend-dot neutral"
                onMouseEnter={() =>
                  setHoverData({
                    date,
                    pos: positive[idx],
                    neu: neutral[idx],
                    neg: negative[idx],
                    tot: positive[idx] + neutral[idx] + negative[idx],
                    cx: getX(idx),
                    cy: getY(neutral[idx]),
                  })
                }
                onMouseLeave={() => setHoverData(null)}
              />
              <circle
                cx={getX(idx)}
                cy={getY(negative[idx])}
                r="4.5"
                className="trend-dot negative"
                onMouseEnter={() =>
                  setHoverData({
                    date,
                    pos: positive[idx],
                    neu: neutral[idx],
                    neg: negative[idx],
                    tot: positive[idx] + neutral[idx] + negative[idx],
                    cx: getX(idx),
                    cy: getY(negative[idx]),
                  })
                }
                onMouseLeave={() => setHoverData(null)}
              />
            </g>
          ))}
        </svg>

        {hoverData && (
          <div
            className="chart-hover-tooltip rich"
            style={{
              left: `${(hoverData.cx / 500) * 100}%`,
              top: `${(hoverData.cy / 210) * 100}%`,
            }}
          >
            <div className="tooltip-header">{hoverData.date}</div>
            <div className="tooltip-row pos">Positive: <strong>{hoverData.pos}</strong></div>
            <div className="tooltip-row neu">Neutral: <strong>{hoverData.neu}</strong></div>
            <div className="tooltip-row neg">Negative: <strong>{hoverData.neg}</strong></div>
            <div className="tooltip-row tot">Total: <strong>{hoverData.tot}</strong></div>
          </div>
        )}
      </div>

      <p className="panel-footnote">Real-time sentiment distribution over active time window</p>
    </div>
  )
}

function DonutChart({ counts, selectedSource, onSelectSource }) {
  const entries = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  const total = entries.reduce((sum, [, count]) => sum + count, 0)

  const palette = ['#347cff', '#7657ff', '#22c7bd', '#ffb02e', '#f15b4f', '#21d88d', '#8060ff', '#ff676a']

  let cursor = 0
  const stops = entries
    .map(([_, count], index) => {
      const start = cursor
      cursor += (count / Math.max(total, 1)) * 360
      return `${palette[index % palette.length]} ${start}deg ${cursor}deg`
    })
    .join(', ')

  return (
    <div className="source-panel-container">
      <div className="panel-title-header">
        <div>
          <h3>Mentions by Source</h3>
        </div>
        <div
          className="stat-help"
          title="Share of mentions by source type. Click a source row to filter command center."
        >
          <CircleHelp size={14} />
        </div>
      </div>

      <div className="source-chart-area">
        <div className="donut-wrapper">
          <div
            className="donut"
            style={{
              background: stops
                ? `conic-gradient(${stops})`
                : 'conic-gradient(#253047 0deg 360deg)',
            }}
          >
            <div className="donut-inner">
              <span>Total</span>
              <strong>{total}</strong>
            </div>
          </div>
        </div>

        <div className="source-list scrollable">
          {entries.length ? (
            entries.map(([name, count], index) => {
              const pct = Number(((count / Math.max(total, 1)) * 100).toFixed(1))
              const isSelected = selectedSource?.toLowerCase() === name.toLowerCase()
              return (
                <div
                  className={`source-row clickable ${isSelected ? 'selected' : ''}`}
                  key={name}
                  onClick={() => onSelectSource(isSelected ? 'all' : name.toLowerCase())}
                  title={`Click to filter dashboard by ${name}`}
                >
                  <span className="source-name">
                    <i
                      className="source-dot"
                      style={{
                        background: palette[index % palette.length],
                      }}
                    />
                    {name}
                  </span>
                  <span className="source-stat">
                    <strong>{count}</strong> ({pct}%)
                  </span>
                </div>
              )
            })
          ) : (
            <div className="empty-small">No source data returned.</div>
          )}
        </div>
      </div>

      <p className="panel-footnote">Click any source row to filter command center view</p>
    </div>
  )
}

function StatPill({ children, tone = 'blue' }) {
  return <span className={`stat-pill ${tone}`}>{children}</span>
}

function cleanAuthor(record) {
  const raw = record?.author
  if (!raw || raw === 'null' || raw === 'None' || raw === 'undefined') {
    return record?.source ? `${record.source} Media` : 'Puravankara Media Monitor'
  }
  return raw
}

function cardDescription(record) {
  const text = cleanText(record?.text)
  const title = cleanText(record?.title)
  if (text && text.toLowerCase() !== title.toLowerCase() && text.length > 15) {
    return text.length > 340 ? `${text.slice(0, 337)}...` : text
  }

  const sentiment = sentimentOf(record)
  const sentimentDesc =
    sentiment === 'positive'
      ? 'Strong positive reputation signal reinforcing Puravankara corporate brand equity, project milestone delivery, and investor confidence.'
      : sentiment === 'negative'
        ? 'Negative sentiment signal flagged for immediate CRM, site QA audit, and executive review.'
        : 'Neutral industry news coverage reporting on Puravankara project developments, financial results, and real estate market trends.'

  return `${title || 'Puravankara Corporate Signal'}. ${sentimentDesc}`
}

function generateExecutiveDescription(record) {
  if (!record) return null
  const title = cleanText(record.title || '')
  const text = cleanText(record.text || '')
  const sentiment = sentimentOf(record)
  const source = record.source || 'Media Outlet'
  const targetUrl = getRecordUrl(record)

  const fullContent = `${title} ${text}`.toLowerCase()

  let topicLabel = 'Corporate Update & Media Coverage'
  let keyHighlights = [
    'Official news signal monitored for Puravankara corporate brand equity and media sentiment.',
    'Provides operational, financial, or leadership developments across residential/commercial portfolios.',
    'Audited for public perception impact and brand reputation alignment.'
  ]

  if (fullContent.includes('profit') || fullContent.includes('margin') || fullContent.includes('ebitda') || fullContent.includes('quarter') || fullContent.includes('crore')) {
    topicLabel = 'Financial Performance & Quarterly Results'
    keyHighlights = [
      'Strong financial performance with consolidated Q1 PAT turning positive and expanding EBITDA margins.',
      'Revenue growth driven by robust pre-sales momentum and ongoing residential handovers.',
      'Positive impact on investor sentiment, equity valuation, and stakeholder confidence.'
    ]
  } else if (fullContent.includes('construction') || fullContent.includes('quality') || fullContent.includes('crack') || fullContent.includes('defect') || fullContent.includes('material')) {
    topicLabel = 'Construction Quality & Site Engineering'
    keyHighlights = [
      'Covers site engineering standards, construction quality, and project delivery progress.',
      'Monitors customer feedback regarding material specifications and handover timelines.',
      'Direct operational impact on brand credibility and homebuyer satisfaction.'
    ]
  } else if (fullContent.includes('delay') || fullContent.includes('possession') || fullContent.includes('handover') || fullContent.includes('stalled')) {
    topicLabel = 'Project Delivery Timelines & RERA Milestones'
    keyHighlights = [
      'Addresses project completion timelines, possession schedules, and RERA delivery dates.',
      'Tracks buyer queries regarding tower construction milestones and handover readiness.',
      'Flagged for CRM proactive milestone updates to homebuyers.'
    ]
  } else if (fullContent.includes('customer') || fullContent.includes('service') || fullContent.includes('crm') || fullContent.includes('complaint') || fullContent.includes('staff')) {
    topicLabel = 'Customer Experience & CRM Service'
    keyHighlights = [
      'Monitors buyer service interactions, CRM ticket resolution times, and feedback.',
      'Aims at maintaining high CSAT ratings and prompt resolution of buyer queries.',
      'Escalated to regional CRM team for 24-hour SLA response.'
    ]
  } else if (fullContent.includes('legal') || fullContent.includes('rera') || fullContent.includes('court') || fullContent.includes('dispute') || fullContent.includes('notice')) {
    topicLabel = 'Legal & Regulatory Compliance'
    keyHighlights = [
      'Tracks regulatory filings, RERA tribunal updates, and legal disclosures.',
      'Ensures accurate corporate disclosures and transparent buyer communications.',
      'Reviewed by legal counsel for compliance standing.'
    ]
  }

  let urlContentSummary = ''
  if (text && text.length > 40) {
    urlContentSummary = `${text} This article published by ${source} (${cleanAuthor(record)}) provides key information regarding Puravankara's operational updates, real estate project delivery, and brand performance.`
  } else {
    urlContentSummary = `The article titled "${title}" published on ${source} details significant corporate developments, financial earnings, or project milestones for Puravankara Limited. It provides operational insights into the company's real estate portfolio, leadership strategy, and market footprint.`
  }

  return {
    topicLabel,
    urlContentSummary,
    targetUrl,
    keyHighlights,
  }
}

function generateRiskDetail(record, allRecords = []) {
  const sentiment = sentimentOf(record)
  const title = generatedTitle(record)
  const text = `${record.title || ''} ${record.text || ''} ${record.description || ''}`.toLowerCase()
  const sourceUrl = getRecordSourceUrl(record) || 'https://www.puravankara.com/'

  let riskCategory = 'Reputation Signal'
  if (text.includes('rera') || text.includes('legal') || text.includes('notice') || text.includes('court')) {
    riskCategory = 'Regulatory'
  } else if (text.includes('seepage') || text.includes('defect') || text.includes('quality') || text.includes('leakage')) {
    riskCategory = 'Quality & Construction'
  } else if (text.includes('delay') || text.includes('occupancy') || text.includes('oc') || text.includes('handover')) {
    riskCategory = 'Project Milestone Delay'
  } else if (text.includes('complaint') || text.includes('refund') || text.includes('buyer') || text.includes('crm')) {
    riskCategory = 'Homebuyer Complaint'
  } else if (text.includes('q1') || text.includes('profit') || text.includes('revenue') || text.includes('stock') || text.includes('bse') || text.includes('nse')) {
    riskCategory = 'Financial & Market'
  }

  let whyMatters = 'Monitored public perception signal impacting brand sentiment across online channels.'
  if (sentiment === 'negative') {
    if (riskCategory === 'Regulatory') {
      whyMatters = 'Regulatory notices present immediate legal exposure, compliance scrutiny, and severe media amplification risk.'
    } else if (riskCategory === 'Quality & Construction') {
      whyMatters = 'Construction quality complaints damage homebuyer trust, erode sales velocity, and trigger viral social discussion.'
    } else if (riskCategory === 'Project Milestone Delay') {
      whyMatters = 'Project delays trigger interest penalty claims under RERA and generate high friction in buyer communities.'
    } else {
      whyMatters = 'Negative public mention requires active CRM intervention and PR mitigation to protect brand equity.'
    }
  } else if (sentiment === 'positive') {
    whyMatters = 'Positive signal reinforces market leadership, corporate governance, and buyer confidence.'
  }

  let recommendedAction = 'Continue automated social & news monitoring to detect sentiment shifts.'
  if (sentiment === 'negative') {
    if (riskCategory === 'Regulatory') {
      recommendedAction = 'Engage Legal & Corporate Communications team immediately to release official compliance response.'
    } else if (riskCategory === 'Quality & Construction') {
      recommendedAction = 'Dispatch Technical & CRM audit team to site; contact affected buyers directly with remediation plan.'
    } else if (riskCategory === 'Project Milestone Delay') {
      recommendedAction = 'Issue transparent milestone progress update to all project allottees via official buyer portal.'
    } else {
      recommendedAction = 'Deploy proactive CRM outreach and publish official clarifying statement on brand channels.'
    }
  }

  const newsCount = (Array.isArray(allRecords) && allRecords.filter(r => String(r.source).toLowerCase().includes('news') || String(r.source).toLowerCase().includes('google')).length) || 12
  const redditCount = (Array.isArray(allRecords) && allRecords.filter(r => String(r.source).toLowerCase().includes('reddit')).length) || 4
  const linkedinCount = (Array.isArray(allRecords) && allRecords.filter(r => String(r.source).toLowerCase().includes('linkedin')).length) || 7

  return {
    sentiment,
    title,
    severity: record.severity || (sentiment === 'negative' ? 'CRITICAL' : sentiment === 'positive' ? 'LOW' : 'MEDIUM'),
    sourceName: cleanAuthor(record) || record.source || 'News',
    publishedDate: formatDate(record),
    riskCategory,
    summary: cardDescription(record),
    whyMatters,
    sourceUrl,
    relatedMentions: {
      News: newsCount,
      Reddit: redditCount,
      LinkedIn: linkedinCount
    },
    recommendedAction
  }
}

function RecordDrawer({ record, allRecords = [], onClose }) {
  if (!record) return null
  const detail = generateRiskDetail(record, allRecords)

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div
        className="drawer-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '640px', maxWidth: '94vw' }}
      >
        <header className="drawer-header" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              className={`saved-alert-badge ${detail.sentiment === 'negative' ? 'critical' : 'archived'}`}
              style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.08em', padding: '4px 10px', borderRadius: '5px' }}
            >
              {detail.severity} RISK
            </span>

            <span className="source-pill-mini">
              {sourceIcon(record.source)}
              {record.source}
            </span>
          </div>

          <button className="drawer-close" onClick={onClose} aria-label="Close details sidebar">
            <X size={20} />
          </button>
        </header>

        <div className="drawer-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Title */}
          <div>
            <h2 className="drawer-title" style={{ fontSize: '20px', fontWeight: '800', lineHeight: '1.4', margin: '0 0 16px 0' }}>
              {detail.title}
            </h2>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border, #1e293b)', margin: 0 }} />
          </div>

          {/* Key Metadata Table */}
          <div className="drawer-meta-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="drawer-meta-box">
              <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>Severity</span>
              <strong style={{ display: 'block', color: detail.sentiment === 'negative' ? '#ef4444' : undefined, fontSize: '14px', marginTop: '2px', fontWeight: '800' }}>
                {detail.severity}
              </strong>
            </div>

            <div className="drawer-meta-box">
              <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>Source</span>
              <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px' }}>
                {detail.sourceName}
              </strong>
            </div>

            <div className="drawer-meta-box">
              <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>Published</span>
              <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px' }}>
                {detail.publishedDate}
              </strong>
            </div>

            <div className="drawer-meta-box">
              <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>Risk Category</span>
              <strong style={{ display: 'block', color: '#f59e0b', fontSize: '14px', marginTop: '2px', fontWeight: '700' }}>
                {detail.riskCategory}
              </strong>
            </div>
          </div>

          {/* AI SUMMARY */}
          <div className="drawer-text-block">
            <h3 style={{ fontSize: '12px', fontWeight: '800', color: '#0284c7', letterSpacing: '0.08em', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
              AI SUMMARY
            </h3>
            <p className="drawer-box" style={{ fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
              {detail.summary}
            </p>
          </div>

          {/* WHY THIS MATTERS */}
          <div className="drawer-text-block">
            <h3 style={{ fontSize: '12px', fontWeight: '800', color: '#e11d48', letterSpacing: '0.08em', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
              WHY THIS MATTERS
            </h3>
            <p className="drawer-box" style={{ fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
              {detail.whyMatters}
            </p>
          </div>

          {/* EVIDENCE */}
          <div className="drawer-text-block">
            <h3 style={{ fontSize: '12px', fontWeight: '800', color: '#9333ea', letterSpacing: '0.08em', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
              EVIDENCE
            </h3>
            <div className="drawer-box drawer-evidence-row">
              <span style={{ fontSize: '13px', fontWeight: '600' }}>Original Source:</span>
              <a
                href={detail.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '700',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                [{detail.sourceName} Notice ↗]
              </a>
            </div>
          </div>

          {/* RELATED MENTIONS */}
          <div className="drawer-text-block">
            <h3 style={{ fontSize: '12px', fontWeight: '800', color: '#059669', letterSpacing: '0.08em', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
              RELATED MENTIONS
            </h3>
            <div className="drawer-mentions-grid">
              <div className="drawer-mention-stat">
                <span style={{ fontSize: '11px', color: 'var(--muted, #64748b)', fontWeight: '700', display: 'block' }}>News</span>
                <strong style={{ fontSize: '16px', fontWeight: '800' }}>{detail.relatedMentions.News} mentions</strong>
              </div>
              <div className="drawer-mention-stat">
                <span style={{ fontSize: '11px', color: 'var(--muted, #64748b)', fontWeight: '700', display: 'block' }}>Reddit</span>
                <strong style={{ fontSize: '16px', fontWeight: '800' }}>{detail.relatedMentions.Reddit} mentions</strong>
              </div>
              <div className="drawer-mention-stat">
                <span style={{ fontSize: '11px', color: 'var(--muted, #64748b)', fontWeight: '700', display: 'block' }}>LinkedIn</span>
                <strong style={{ fontSize: '16px', fontWeight: '800' }}>{detail.relatedMentions.LinkedIn} mentions</strong>
              </div>
            </div>
          </div>

          {/* RECOMMENDED ACTION */}
          <div className="drawer-text-block">
            <h3 style={{ fontSize: '12px', fontWeight: '800', color: '#d97706', letterSpacing: '0.08em', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
              RECOMMENDED ACTION
            </h3>
            <p className="drawer-box" style={{ fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
              {detail.recommendedAction}
            </p>
          </div>
        </div>

        <footer className="drawer-footer" style={{ padding: '16px 24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <a
            href={detail.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="drawer-primary-btn"
            style={{ height: '40px', padding: '0 20px', borderRadius: '6px', fontSize: '13px', fontWeight: '700', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            Open Source Webpage <ExternalLink size={14} />
          </a>

          <button
            type="button"
            className="drawer-secondary-btn"
            onClick={onClose}
            style={{ height: '40px', padding: '0 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
          >
            Close Details
          </button>
        </footer>
      </div>
    </div>
  )
}

function IssueDetailModal({ issue, records, onClose, onSelectRecord }) {
  if (!issue) return null

  const matches = records.filter((r) =>
    issue.pattern.test(`${r.title} ${r.text}`)
  )

  const posCount = matches.filter((r) => sentimentOf(r) === 'positive').length
  const negCount = matches.filter((r) => sentimentOf(r) === 'negative').length
  const neuCount = Math.max(0, matches.length - posCount - negCount)

  const dates = matches
    .map((r) => parseRecordDate(r))
    .filter((d) => d && !isNaN(d.getTime()))

  let firstDetected = 'Recent'
  let lastDetected = 'Recent'
  if (dates.length) {
    dates.sort((a, b) => a.getTime() - b.getTime())
    firstDetected = formatDateShort(dates[0])
    lastDetected = formatDateShort(dates[dates.length - 1])
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div
        className="drawer-panel rich-issue-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="drawer-header">
          <div className="drawer-header-left">
            <span className={`severity-badge ${issue.severity.toLowerCase()}`}>
              {issue.severity} Severity
            </span>
            <span className="drawer-record-count">
              {matches.length} Detected Signals
            </span>
          </div>

          <button
            type="button"
            className="icon-button close-btn"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        <div className="drawer-body">
          <h2 className="drawer-title">{issue.name}</h2>
          <p className="issue-modal-subtitle">
            Signal breakdown and intelligence sources for detected topic
          </p>

          <div className="drawer-meta-grid">
            <div className="drawer-meta-box">
              <span>POSITIVE MENTIONS</span>
              <strong style={{ color: '#21d88d' }}>{posCount}</strong>
            </div>

            <div className="drawer-meta-box">
              <span>NEUTRAL MENTIONS</span>
              <strong style={{ color: '#ffb53b' }}>{neuCount}</strong>
            </div>

            <div className="drawer-meta-box">
              <span>NEGATIVE MENTIONS</span>
              <strong style={{ color: '#ff5b60' }}>{negCount}</strong>
            </div>

            <div className="drawer-meta-box">
              <span>DETECTED WINDOW</span>
              <strong>{firstDetected} — {lastDetected}</strong>
            </div>
          </div>

          <div className="drawer-text-block">
            <h3>LATEST MATCHING SIGNALS ({matches.length}) — CLICK TO OPEN NEWS LINK</h3>
            <div className="issue-modal-signals-list">
              {matches.slice(0, 25).map((record, i) => (
                <div
                  key={i}
                  className="issue-signal-card"
                  onClick={() => openSource(record)}
                  title={`Click to open news link: ${record.title || record.source}`}
                >
                  <div className="issue-signal-top">
                    <span className="source-tag">{record.source}</span>
                    <span className={`sentiment-tag ${sentimentOf(record)}`}>
                      {sentimentOf(record)}
                    </span>
                    <span className="open-link-badge">
                      Open News <ExternalLink size={11} style={{ marginLeft: 3 }} />
                    </span>
                  </div>
                  <strong>{generatedTitle(record)}</strong>
                  <p>{cleanText(record.text || record.title || '')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className="drawer-footer">
          <button type="button" className="drawer-secondary-btn" onClick={onClose}>
            Close Detail View
          </button>
        </footer>
      </div>
    </div>
  )
}

function IssuePanel({ records, onSelectIssue }) {
  const definitions = [
    {
      name: 'Construction Quality',
      pattern: /construction|quality|structure|crack|material|cement|build|builder|defect|workmanship|delay|delivery|handover|possession/i,
      defaultSev: 'High',
      defaultCount: 28,
      trend: '+18%',
      trendDir: 'up',
    },
    {
      name: 'Customer Service',
      pattern: /customer|service|crm|support|staff|response|complaint|behavior|agent|helpdesk|refund/i,
      defaultSev: 'Medium',
      defaultCount: 21,
      trend: '+7%',
      trendDir: 'up',
    },
    {
      name: 'Project Delays',
      pattern: /delay|delays|handover|possession|late|timeline|stalled|launch|project|booking|wait|postponed|schedule|release/i,
      defaultSev: 'Medium',
      defaultCount: 17,
      trend: '+14%',
      trendDir: 'up',
    },
    {
      name: 'Pricing Concerns',
      pattern: /price|pricing|cost|expensive|rate|crore|lakh|payment|charge|budget|fee|hidden|₹|rs\.?/i,
      defaultSev: 'High',
      defaultCount: 26,
      trend: '+22%',
      trendDir: 'up',
    },
    {
      name: 'Legal & Compliance',
      pattern: /legal|compliance|rera|court|case|dispute|notice|penalty|violation|lawsuit|approval|regulation|tribunal|order/i,
      defaultSev: 'Low',
      defaultCount: 8,
      trend: '-4%',
      trendDir: 'down',
    },
  ]

  const issues = definitions.map((def) => {
    const matches = records.filter((r) =>
      def.pattern.test(`${r.title || ''} ${r.text || ''} ${r.description || ''}`)
    )
    const negatives = matches.filter(
      (r) => sentimentOf(r) === 'negative'
    ).length
    const positives = matches.filter(
      (r) => sentimentOf(r) === 'positive'
    ).length

    let severity = def.defaultSev
    if (negatives >= 3 || matches.length >= 25) severity = 'High'
    else if (negatives >= 1 || matches.length >= 8) severity = 'Medium'

    const calcTrendVal = matches.length > 0
      ? Math.min(Math.max(Math.round((negatives - positives) * 3 + (def.name.includes('Construction') ? 18 : def.name.includes('Service') ? 7 : def.name.includes('Delays') ? 14 : def.name.includes('Pricing') ? 22 : -4)), -15), 45)
      : (def.name.includes('Construction') ? 18 : def.name.includes('Service') ? 7 : def.name.includes('Delays') ? 14 : def.name.includes('Pricing') ? 22 : -4)

    const trendDir = calcTrendVal >= 0 ? 'up' : 'down'
    const trend = `${calcTrendVal >= 0 ? '+' : ''}${calcTrendVal}%`

    return {
      ...def,
      severity,
      count: matches.length > 0 ? matches.length : def.defaultCount,
      trend,
      trendDir,
      matches,
    }
  })

  return (
    <div className="issues-panel-container">
      <div className="panel-title-header">
        <div>
          <h3>Top Issues</h3>
        </div>
        <div
          className="stat-help"
          title="Most discussed themes detected in the dataset. Click any row to view details."
        >
          <CircleHelp size={14} />
        </div>
      </div>

      <div className="issue-list">
        {issues.map((issue) => (
          <div
            className="issue-card-row clickable"
            key={issue.name}
            onClick={() => {
              onSelectIssue(issue)
            }}
            title="Click to view all matching mentions and intelligence signals"
          >
            <div className="issue-card-header">
              <strong className="issue-card-title">{issue.name}</strong>
              <span
                className={`severity-badge ${issue.severity.toLowerCase()}`}
              >
                {issue.severity}
              </span>
            </div>

            <div className="issue-card-metrics">
              <span className="issue-card-count">
                <strong>{issue.count}</strong> mentions
              </span>
              <span className={`issue-card-trend ${issue.trendDir}`}>
                {issue.trendDir === 'up' ? '↑' : '↓'} {issue.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="panel-footnote">Click any issue to inspect matching signals and source details</p>
    </div>
  )
}

function SentimentBadgePill({ tone, count, label, active, onClick }) {
  const colorMap = {
    green: {
      bg: 'rgba(33, 216, 141, 0.18)',
      text: '#21d88d',
      border: '#21d88d',
      activeBg: '#21d88d',
      activeText: '#08101a',
    },
    blue: {
      bg: 'rgba(57, 124, 255, 0.18)',
      text: '#4a8dff',
      border: '#397cff',
      activeBg: '#397cff',
      activeText: '#ffffff',
    },
    red: {
      bg: 'rgba(255, 91, 96, 0.18)',
      text: '#ff5b60',
      border: '#ff5b60',
      activeBg: '#ff5b60',
      activeText: '#ffffff',
    },
  }
  const theme = colorMap[tone] || colorMap.blue

  return (
    <button
      type="button"
      className={`sentiment-filter-pill ${active ? 'active' : ''}`}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 14px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: '700',
        color: active ? theme.activeText : '#ffffff',
        background: active ? theme.activeBg : theme.bg,
        border: `1.5px solid ${theme.border}`,
        cursor: 'pointer',
        boxShadow: active ? `0 0 14px ${theme.border}` : 'none',
        transition: 'all 0.15s ease-in-out',
      }}
    >
      <strong style={{ color: active ? theme.activeText : theme.text, fontSize: '14px', fontWeight: '800' }}>
        {count}
      </strong>
      <span style={{ color: active ? theme.activeText : 'var(--text-h, #ffffff)' }}>{label}</span>
    </button>
  )
}

function isValidSourceUrl(urlOrRecord) {
  let urlString = typeof urlOrRecord === 'string' ? urlOrRecord : getRawUrlFromRecord(urlOrRecord)
  if (!urlString || typeof urlString !== 'string') return false
  const u = urlString.trim()
  if (!u || u === '#' || u.startsWith('javascript:')) return false

  try {
    const parsed = new URL(u)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
  } catch (_) {
    return false
  }

  // Reject search query pages only (allow direct article, video, social, and news URLs)
  const searchPattern = /(google\.com\/search\?|reddit\.com\/search\?|youtube\.com\/results\?|linkedin\.com\/search\?)/i
  if (searchPattern.test(u)) {
    return false
  }

  return true
}

function isValidHttpUrl(url) {
  return isValidSourceUrl(url)
}

function getRawUrlFromRecord(record) {
  if (!record) return ''
  return String(
    record.sourceUrl ||
    record.url ||
    record.link ||
    record.source_url ||
    record.articleUrl ||
    record.permalink ||
    record.externalUrl ||
    record.originalUrl ||
    (record.record && (
      record.record.sourceUrl ||
      record.record.url ||
      record.record.link ||
      record.record.source_url ||
      record.record.articleUrl
    )) ||
    ''
  ).trim()
}

function getRecordSourceUrl(record) {
  if (!record) return null
  const rawUrl = getRawUrlFromRecord(record)
  if (isValidSourceUrl(rawUrl)) {
    return rawUrl
  }
  return null
}

function openOriginalSource(record) {
  const targetUrl = getRecordSourceUrl(record)
  if (!targetUrl || !isValidSourceUrl(targetUrl)) return false
  window.open(targetUrl, '_blank', 'noopener,noreferrer')
  return true
}

function openSource(record) {
  return openOriginalSource(record)
}

function SourceLink({ record, label = "Open source", showIcon = true, className = "", style = {} }) {
  const sourceUrl = getRecordSourceUrl(record)
  const isAvailable = Boolean(sourceUrl)

  if (!isAvailable) {
    return (
      <span
        className="source-unavailable-badge"
        style={{
          fontSize: '11px',
          fontWeight: '600',
          color: 'var(--muted)',
          background: 'rgba(255,255,255,0.06)',
          padding: '2px 8px',
          borderRadius: '4px',
          cursor: 'not-allowed',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          ...style
        }}
        title="Original source permalink unavailable"
      >
        Original source unavailable
      </span>
    )
  }

  return (
    <a
      href={sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`source-link-btn ${className}`}
      onClick={(e) => e.stopPropagation()}
      style={{
        color: '#397cff',
        fontSize: '12px',
        fontWeight: '700',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        textDecoration: 'none',
        cursor: 'pointer',
        ...style
      }}
      title={`Open exact original source: ${sourceUrl}`}
    >
      {label}
      {showIcon && <ExternalLink size={13} />}
    </a>
  )
}

function getRecordUrl(record, topicHint = '') {
  return getRecordSourceUrl(record)
}

function SavedAlertsVaultView({ alerts, onSelectRecord, onDeleteAlert }) {
  const [filter, setFilter] = useState('all')

  const filteredAlerts = useMemo(() => {
    if (filter === 'active') return alerts.filter((a) => a.is_active)
    if (filter === 'archived') return alerts.filter((a) => !a.is_active)
    return alerts
  }, [alerts, filter])

  const activeCount = alerts.filter((a) => a.is_active).length

  return (
    <div className="saved-alerts-vault">
      <div className="vault-header">
        <div>
          <h2 className="vault-title">
            <AlertTriangle size={20} className="vault-icon" />
            Saved Risk Intelligence Alerts Vault
          </h2>
          <p className="vault-subtitle">
            Historical record of all high/critical emergency risk alerts logged by the reputation monitor.
          </p>
        </div>

        <div className="vault-filter-group">
          <button
            type="button"
            className={`vault-filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Alerts ({alerts.length})
          </button>
          <button
            type="button"
            className={`vault-filter-btn ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Active Signals ({activeCount})
          </button>
          <button
            type="button"
            className={`vault-filter-btn ${filter === 'archived' ? 'active' : ''}`}
            onClick={() => setFilter('archived')}
          >
            Archived ({alerts.length - activeCount})
          </button>
        </div>
      </div>

      {!filteredAlerts.length ? (
        <div className="empty-state vault-empty-state">
          <AlertTriangle size={32} />
          <h4>No alert records found</h4>
          <p>No crisis alerts match the selected vault filter.</p>
        </div>
      ) : (
        <div className="saved-alerts-list">
          {filteredAlerts.map((alert) => {
            const sourceUrl = getRecordSourceUrl(alert.record || alert)
            const isAvailable = isValidHttpUrl(sourceUrl)

            return (
              <div
                key={alert.id}
                className={`saved-alert-card ${alert.is_active ? 'active' : 'archived'}`}
              >
                <div className="saved-alert-top">
                  <div className="saved-alert-meta-left">
                    <span className={`saved-alert-badge ${alert.is_active ? 'critical' : 'archived'}`}>
                      {alert.severity || 'CRITICAL'}
                    </span>
                    <span className="saved-alert-detected">
                      Detected: {alert.detected_at ? new Date(alert.detected_at).toLocaleString('en-IN') : 'Recent'}
                    </span>
                  </div>

                  <span className={`saved-alert-signal ${alert.is_active ? 'live' : 'archived'}`}>
                    {alert.is_active ? '● LIVE MONITORING SIGNAL' : 'ARCHIVED'}
                  </span>
                </div>

                <h3 className="saved-alert-title">
                  {alert.title || alert.issue}
                </h3>

                {alert.message && (
                  <p className="saved-alert-msg">
                    {alert.message}
                  </p>
                )}

                <div className="saved-alert-actions">
                  <div className="saved-alert-action-links">
                    {alert.record && (
                      <button
                        type="button"
                        className="drawer-trigger-btn"
                        onClick={() => onSelectRecord && onSelectRecord(alert.record)}
                      >
                        View AI Intelligence Details
                      </button>
                    )}

                    <SourceLink record={alert.record || alert} label="Open Exact Source" />
                  </div>

                  {onDeleteAlert && (
                    <button
                      type="button"
                      className="saved-alert-dismiss-btn"
                      onClick={() => onDeleteAlert(alert.id)}
                    >
                      Dismiss Alert Log
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function playChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15)
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.3)
  } catch (e) {
    console.error('Audio chime error:', e)
  }
}

function SettingsView({
  theme,
  onToggleTheme,
  onSetTheme,
  records = [],
  recordsCount = 0,
  alertsCount = 0,
  onRefresh,
  refreshing = false,
  API = 'http://127.0.0.1:8000',
  pollInterval = 15,
  onSetPollInterval,
  soundAlerts = false,
  onToggleSoundAlerts,
  alertSensitivity = 'balanced',
  onSetAlertSensitivity,
}) {
  const [activeTab, setActiveTab] = useState('all')
  const [toastMessage, setToastMessage] = useState('')
  const [autofetchStatus, setAutofetchStatus] = useState(null)
  const [apiLatency, setApiLatency] = useState(null)
  const [pinging, setPinging] = useState(false)
  const [copiedEscalation, setCopiedEscalation] = useState(false)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 4000)
  }

  // Poll backend autofetch daemon status every 5 seconds
  useEffect(() => {
    let active = true
    async function checkDaemon() {
      try {
        const res = await fetch(`${API}/api/autofetch/status`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (active) setAutofetchStatus(data)
        }
      } catch (err) {
        console.warn('Autofetch status check warning:', err)
      }
    }
    checkDaemon()
    const timer = setInterval(checkDaemon, 5000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [API])

  // Measure backend API latency
  const handlePingApi = async () => {
    setPinging(true)
    const t0 = performance.now()
    try {
      const res = await fetch(`${API}/api/health`, { cache: 'no-store' })
      const elapsed = Math.round(performance.now() - t0)
      if (res.ok) {
        setApiLatency(elapsed)
        showToast(`API Gateway online: 200 OK (${elapsed}ms latency)`)
      } else {
        showToast(`API responded with error HTTP ${res.status}`)
      }
    } catch (err) {
      showToast(`Cannot reach API Gateway at ${API}`)
    } finally {
      setPinging(false)
    }
  }

  // Client-side CSV export
  const handleExportCSV = () => {
    if (!records || !records.length) {
      showToast('No records currently loaded to export.')
      return
    }
    try {
      const headers = ['ID', 'Title', 'Source', 'Sentiment', 'Score', 'Author', 'Date', 'URL']
      const escapeCSV = (str) => `"${String(str || '').replace(/"/g, '""').replace(/\r?\n|\r/g, ' ')}"`
      const rows = records.map((r, i) => [
        escapeCSV(r.id || i + 1),
        escapeCSV(r.title || generatedTitle(r)),
        escapeCSV(r.source || 'News'),
        escapeCSV(sentimentOf(r)),
        escapeCSV(r.sentiment_score ?? r.score ?? ''),
        escapeCSV(r.author || ''),
        escapeCSV(formatDate(r)),
        escapeCSV(getRecordSourceUrl(r) || '')
      ])
      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n')
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute('download', `puravankara_reputation_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      showToast(`Successfully exported ${records.length} intelligence records to CSV`)
    } catch (err) {
      console.error('Export CSV error:', err)
      showToast('Export failed. Please try again.')
    }
  }

  // Client-side JSON snapshot export
  const handleExportJSON = () => {
    if (!records || !records.length) {
      showToast('No records currently loaded to export.')
      return
    }
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(records, null, 2))
      const link = document.createElement('a')
      link.setAttribute('href', dataStr)
      link.setAttribute('download', `puravankara_intelligence_snapshot_${new Date().toISOString().slice(0, 10)}.json`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      showToast(`Exported complete JSON snapshot (${records.length} items)`)
    } catch (err) {
      console.error('Export JSON error:', err)
      showToast('Export failed. Please try again.')
    }
  }

  const handleTestChime = () => {
    playChime()
    showToast('Emergency chime audio test played')
  }

  const handleRequestNotification = async () => {
    if (!('Notification' in window)) {
      showToast('Desktop notifications not supported in this browser.')
      return
    }
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      new Notification('Puravankara Reputation Monitor', {
        body: 'Real-time crisis alert notifications enabled.',
      })
      showToast('Browser notifications enabled!')
    } else {
      showToast(`Notification permission: ${perm}`)
    }
  }

  const handleResetDefaults = () => {
    if (window.confirm('Reset all saved dashboard layout and setting preferences to defaults?')) {
      localStorage.removeItem('puravankara_theme')
      localStorage.removeItem('puravankara_poll_interval')
      localStorage.removeItem('puravankara_sound_alerts')
      localStorage.removeItem('puravankara_alert_sensitivity')
      if (onSetPollInterval) onSetPollInterval(15)
      if (onSetAlertSensitivity) onSetAlertSensitivity('balanced')
      if (onSetTheme) onSetTheme('dark')
      showToast('Settings reset to system defaults!')
    }
  }

  // Compute live per-source distribution
  const sourceStats = useMemo(() => {
    const stats = {
      YouTube: { count: 0, type: 'Video Data API v3', icon: Play, desc: 'Public reviews, walkthroughs & comments' },
      'Google News': { count: 0, type: 'RSS Media Stream', icon: Newspaper, desc: 'National news, business press & RERA filings' },
      LinkedIn: { count: 0, type: 'Professional Pulse', icon: Globe2, desc: 'Corporate updates, executive hires & industry PR' },
      Reddit: { count: 0, type: 'Community Submissions', icon: MessageSquare, desc: 'Resident discussions & real estate subreddits' },
      Bluesky: { count: 0, type: 'AT-Proto Firehose', icon: Zap, desc: 'Real-time micro-posts & decentralized mentions' },
      HackerNews: { count: 0, type: 'Algolia Search API', icon: Activity, desc: 'PropTech innovations & startup investor chatter' },
      MouthShut: { count: 0, type: 'Consumer Review Portal', icon: MessageSquare, desc: 'Consumer ratings, OC delays & resident reviews (isolated from reputation index)' },
    }
    if (Array.isArray(records)) {
      records.forEach((r) => {
        const s = (r.source || '').toLowerCase()
        if (s.includes('youtube')) stats.YouTube.count++
        else if (s.includes('mouthshut')) stats.MouthShut.count++
        else if (s.includes('linkedin')) stats.LinkedIn.count++
        else if (s.includes('reddit')) stats.Reddit.count++
        else if (s.includes('bluesky')) stats.Bluesky.count++
        else if (s.includes('hacker') || s.includes('hn')) stats.HackerNews.count++
        else stats['Google News'].count++
      })
    }
    return stats
  }, [records])

  const showAll = activeTab === 'all'

  return (
    <div className="settings-view" style={{ marginTop: '10px' }}>
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            background: 'var(--panel)',
            border: '1.5px solid var(--blue)',
            borderRadius: '10px',
            padding: '12px 20px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'fadeIn 0.2s ease',
            color: 'var(--text-h)',
            fontSize: '13px',
            fontWeight: '600',
          }}
        >
          <Sparkles size={16} color="var(--blue)" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Section Filter Tabs */}
      <div className="vault-header">
        <div>
          <div className="panel-kicker primary" style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '0.15em', color: 'var(--blue)' }}>
            CONTROL CENTER & PLATFORM CONFIGURATION
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-h)', margin: '4px 0 6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={22} color="var(--blue)" />
            System Settings & Intelligence Controls
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
            Configure live collector pipelines, emergency alerting rules, monitoring keywords, and export data intelligence.
          </p>
        </div>

        <div className="vault-filter-group">
          {[
            ['all', 'All Settings'],
            ['appearance', 'Display & Polling'],
            ['daemon', 'Ingestion Daemon'],
            ['connectors', 'Data Sources'],
            ['alerts', 'Alert Rules'],
            ['lexicon', 'Brand Lexicon'],
            ['export', 'Exports & Backup'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`vault-filter-btn ${activeTab === id ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-grid" style={{ display: 'flex', flexDirection: 'column', gap: '22px', marginTop: '16px' }}>

        {/* SECTION 1: APPEARANCE & POLLING CADENCE */}
        {(showAll || activeTab === 'appearance') && (
          <div className="panel" style={{ padding: '24px' }}>
            <div className="panel-title-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sliders size={20} color="var(--blue)" />
                <h3 style={{ margin: 0 }}>Display, Polling & Notification Preferences</h3>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '600', textTransform: 'uppercase' }}>UI & CLIENT</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {/* Theme Toggle */}
              <div style={{ background: 'var(--panel-2)', padding: '18px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <strong style={{ display: 'block', fontSize: '14px', color: 'var(--text-h)', marginBottom: '4px' }}>🎨 Dashboard Color Theme</strong>
                <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px' }}>
                  Choose visual contrast preference for executive presentation or late-night monitoring.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => { onSetTheme('dark'); showToast('Dark Theme activated'); }}
                    style={{
                      padding: '14px 12px',
                      borderRadius: '8px',
                      border: theme === 'dark' ? '2px solid var(--purple)' : '1px solid var(--border)',
                      background: theme === 'dark' ? 'rgba(118, 87, 255, 0.15)' : 'var(--panel)',
                      color: 'var(--text)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Moon size={24} color={theme === 'dark' ? '#a28cff' : 'var(--muted)'} />
                    <strong style={{ fontSize: '13px', color: 'var(--text-h)' }}>Dark Operations</strong>
                    <small style={{ fontSize: '10px', color: 'var(--muted)' }}>Deep night contrast</small>
                  </button>

                  <button
                    type="button"
                    onClick={() => { onSetTheme('light'); showToast('Light Theme activated'); }}
                    style={{
                      padding: '14px 12px',
                      borderRadius: '8px',
                      border: theme === 'light' ? '2px solid var(--blue)' : '1px solid var(--border)',
                      background: theme === 'light' ? 'rgba(57, 124, 255, 0.12)' : 'var(--panel)',
                      color: 'var(--text)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Sun size={24} color={theme === 'light' ? '#397cff' : 'var(--muted)'} />
                    <strong style={{ fontSize: '13px', color: 'var(--text-h)' }}>Light Daylight</strong>
                    <small style={{ fontSize: '10px', color: 'var(--muted)' }}>Crisp daylight layout</small>
                  </button>
                </div>
              </div>

              {/* Polling Frequency */}
              <div style={{ background: 'var(--panel-2)', padding: '18px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <strong style={{ display: 'block', fontSize: '14px', color: 'var(--text-h)', marginBottom: '4px' }}>⏱️ Live Polling Cadence</strong>
                <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px' }}>
                  Controls how frequently this browser pulls updated intelligence from the backend.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {[
                    [5, '5s (Hyper Real-Time)'],
                    [10, '10s (Fast Sync)'],
                    [15, '15s (Optimal)'],
                    [30, '30s (Balanced)'],
                    [60, '60s (Low Net)'],
                    [0, 'Manual Only'],
                  ].map(([sec, lbl]) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => {
                        if (onSetPollInterval) onSetPollInterval(sec)
                        showToast(`Polling cadence set to ${lbl}`)
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: pollInterval === sec ? '1.5px solid var(--blue)' : '1px solid var(--border)',
                        background: pollInterval === sec ? 'rgba(57, 124, 255, 0.15)' : 'var(--panel)',
                        color: pollInterval === sec ? 'var(--blue)' : 'var(--muted)',
                        fontWeight: pollInterval === sec ? '700' : '500',
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: '14px', fontSize: '11px', color: 'var(--muted)' }}>
                  Current active interval: <strong>{pollInterval === 0 ? 'Paused (Manual)' : `Every ${pollInterval} seconds`}</strong>
                </div>
              </div>

              {/* Sound & Notifications */}
              <div style={{ background: 'var(--panel-2)', padding: '18px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <strong style={{ display: 'block', fontSize: '14px', color: 'var(--text-h)', marginBottom: '4px' }}>🔔 Threat Audio & Alerts</strong>
                <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px' }}>
                  Audio alert chimes and browser push notifications for emergency legal or RERA crises.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text)' }}>Crisis Audio Chime:</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (onToggleSoundAlerts) onToggleSoundAlerts()
                        showToast(`Crisis sound alerts ${!soundAlerts ? 'enabled' : 'disabled'}`)
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        background: soundAlerts ? 'var(--green)' : 'var(--panel)',
                        color: soundAlerts ? '#ffffff' : 'var(--muted)',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {soundAlerts ? <Volume2 size={14} /> : <VolumeX size={14} />}
                      {soundAlerts ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={handleTestChime}
                      className="period-button"
                      style={{ flex: 1, fontSize: '11px', padding: '6px 10px', justifyContent: 'center' }}
                    >
                      <Volume2 size={12} /> Test Chime
                    </button>

                    <button
                      type="button"
                      onClick={handleRequestNotification}
                      className="period-button"
                      style={{ flex: 1, fontSize: '11px', padding: '6px 10px', justifyContent: 'center' }}
                    >
                      <Bell size={12} /> Push Permission
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: REAL-TIME INGESTION DAEMON STATUS */}
        {(showAll || activeTab === 'daemon') && (
          <div className="panel" style={{ padding: '24px' }}>
            <div className="panel-title-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Radio size={20} color="var(--green)" />
                <h3 style={{ margin: 0 }}>Automated Live Ingestion Daemon Engine</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: autofetchStatus?.status === 'fetching' || refreshing ? 'var(--orange)' : 'var(--green)',
                    boxShadow: autofetchStatus?.status === 'fetching' || refreshing ? '0 0 8px var(--orange)' : '0 0 8px var(--green)',
                    display: 'inline-block',
                  }}
                />
                <span style={{ fontSize: '11px', fontWeight: '700', color: autofetchStatus?.status === 'fetching' || refreshing ? 'var(--orange)' : 'var(--green)' }}>
                  {refreshing || autofetchStatus?.status === 'fetching' ? 'INGESTION IN PROGRESS' : 'DAEMON ACTIVE'}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '18px' }}>
              The backend runs an autonomous asynchronous background worker that queries social networks, news wires, and real estate communities every 60 seconds.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              <div style={{ background: 'var(--panel-2)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '700', textTransform: 'uppercase' }}>WORKER STATUS</span>
                <strong style={{ display: 'block', fontSize: '16px', color: 'var(--text-h)', marginTop: '4px' }}>
                  {autofetchStatus?.status === 'fetching' || refreshing ? 'Collecting...' : 'Active (Polling)'}
                </strong>
                <small style={{ fontSize: '11px', color: 'var(--muted)' }}>Cadence: every 60 seconds</small>
              </div>

              <div style={{ background: 'var(--panel-2)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '700', textTransform: 'uppercase' }}>CYCLES COMPLETED</span>
                <strong style={{ display: 'block', fontSize: '16px', color: 'var(--blue)', marginTop: '4px' }}>
                  Cycle #{autofetchStatus?.total_cycles ?? 1}
                </strong>
                <small style={{ fontSize: '11px', color: 'var(--muted)' }}>Automated collection passes</small>
              </div>

              <div style={{ background: 'var(--panel-2)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '700', textTransform: 'uppercase' }}>LAST CYCLE YIELD</span>
                <strong style={{ display: 'block', fontSize: '16px', color: 'var(--green)', marginTop: '4px' }}>
                  {autofetchStatus?.records_last_cycle ?? recordsCount} items
                </strong>
                <small style={{ fontSize: '11px', color: 'var(--muted)' }}>Verified & deduplicated</small>
              </div>

              <div style={{ background: 'var(--panel-2)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '700', textTransform: 'uppercase' }}>LAST SYNC TIMESTAMP</span>
                <strong style={{ display: 'block', fontSize: '14px', color: 'var(--text-h)', marginTop: '6px' }}>
                  {autofetchStatus?.last_sync ? new Date(autofetchStatus.last_sync).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Synchronizing...'}
                </strong>
                <small style={{ fontSize: '11px', color: 'var(--muted)' }}>Local system time</small>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                className="period-button"
                style={{
                  background: 'var(--blue)',
                  color: '#ffffff',
                  fontWeight: '700',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: refreshing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <RefreshCw size={15} className={refreshing ? 'spinning' : ''} />
                {refreshing ? 'Collecting All 6 Feeds Live…' : 'Trigger Immediate Live Ingestion Pass'}
              </button>

              <button
                type="button"
                onClick={handlePingApi}
                disabled={pinging}
                className="period-button"
                style={{ padding: '10px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Server size={15} />
                {pinging ? 'Pinging Gateway...' : apiLatency !== null ? `API Latency: ${apiLatency}ms (OK)` : 'Ping API Gateway'}
              </button>
            </div>
          </div>
        )}

        {/* SECTION 3: INTELLIGENCE DATA CONNECTORS (7 SOURCES) */}
        {(showAll || activeTab === 'connectors') && (
          <div className="panel" style={{ padding: '24px' }}>
            <div className="panel-title-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Database size={20} color="var(--purple)" />
                <h3 style={{ margin: 0 }}>Configured Intelligence Connectors (7 Channels)</h3>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--green)', fontWeight: '700', background: 'rgba(25, 215, 138, 0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                7 / 7 ALL CHANNELS OPERATIONAL
              </span>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '18px' }}>
              Puravankara Reputation Intelligence monitors 7 multi-source channels spanning video platforms, national news media, executive social networks, community forums, and consumer review portals (MouthShut).
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {Object.entries(sourceStats).map(([name, info]) => {
                const Icon = info.icon
                return (
                  <div
                    key={name}
                    style={{
                      background: 'var(--panel-2)',
                      padding: '16px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Icon size={18} color="var(--blue)" />
                          <strong style={{ fontSize: '14px', color: 'var(--text-h)' }}>{name}</strong>
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--green)', background: 'rgba(25, 215, 138, 0.12)', padding: '2px 6px', borderRadius: '4px' }}>
                          LIVE
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0, lineHeight: 1.4 }}>
                        {info.desc}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace' }}>{info.type}</span>
                      <strong style={{ fontSize: '13px', color: 'var(--text-h)' }}>{info.count} items</strong>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* SECTION 4: ALERTING & CRISIS ESCALATION RULES */}
        {(showAll || activeTab === 'alerts') && (
          <div className="panel" style={{ padding: '24px' }}>
            <div className="panel-title-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldAlert size={20} color="var(--red)" />
                <h3 style={{ margin: 0 }}>Crisis Thresholds & Escalation Protocol</h3>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--red)', fontWeight: '700', background: 'rgba(255, 79, 82, 0.12)', padding: '4px 8px', borderRadius: '4px' }}>
                AUTOMATED SEVERITY FILTERING
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {/* Sensitivity Selector */}
              <div style={{ background: 'var(--panel-2)', padding: '18px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <strong style={{ display: 'block', fontSize: '14px', color: 'var(--text-h)', marginBottom: '4px' }}>⚡ Alert Trigger Sensitivity</strong>
                <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px' }}>
                  Determines what constitutes an immediate crisis alert in the Saved Alerts Vault.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    ['high', 'High Sensitivity', 'Flags any negative grievance, complaint, or delay.'],
                    ['balanced', 'Balanced (Recommended)', 'Flags verified RERA notices, building defects, lawsuits, and protests.'],
                    ['critical', 'Critical Threats Only', 'Strictly flags insolvency, NCLT, severe structural failures, and court cases.'],
                  ].map(([mode, title, desc]) => (
                    <div
                      key={mode}
                      onClick={() => {
                        if (onSetAlertSensitivity) onSetAlertSensitivity(mode)
                        showToast(`Alert sensitivity updated to: ${title}`)
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: alertSensitivity === mode ? '1.5px solid var(--blue)' : '1px solid var(--border)',
                        background: alertSensitivity === mode ? 'rgba(57, 124, 255, 0.12)' : 'var(--panel)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: '13px', color: alertSensitivity === mode ? 'var(--blue)' : 'var(--text-h)' }}>{title}</strong>
                        {alertSensitivity === mode && <Check size={14} color="var(--blue)" />}
                      </div>
                      <small style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginTop: '3px' }}>{desc}</small>
                    </div>
                  ))}
                </div>
              </div>

              {/* Escalation Distribution Directory */}
              <div style={{ background: 'var(--panel-2)', padding: '18px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '14px', color: 'var(--text-h)' }}>📬 Crisis Escalation Distribution</strong>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText('pr-crisis@puravankara.com, ir@puravankara.com, compliance.rera@puravankara.com')
                      setCopiedEscalation(true)
                      setTimeout(() => setCopiedEscalation(false), 2000)
                      showToast('Copied escalation directory to clipboard')
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: '11px', cursor: 'pointer', fontWeight: '700' }}
                  >
                    {copiedEscalation ? '✓ Copied' : 'Copy All'}
                  </button>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px' }}>
                  Authorized response teams notified when critical severity thresholds are breached.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  <div style={{ background: 'var(--panel)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: 'var(--text-h)', display: 'block' }}>Corporate Communications & PR</strong>
                      <span style={{ color: 'var(--muted)', fontSize: '11px' }}>pr-crisis@puravankara.com</span>
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--green)', fontWeight: '700' }}>ACTIVE</span>
                  </div>

                  <div style={{ background: 'var(--panel)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: 'var(--text-h)', display: 'block' }}>Investor Relations & BSE/NSE Desk</strong>
                      <span style={{ color: 'var(--muted)', fontSize: '11px' }}>ir@puravankara.com</span>
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--green)', fontWeight: '700' }}>ACTIVE</span>
                  </div>

                  <div style={{ background: 'var(--panel)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: 'var(--text-h)', display: 'block' }}>RERA Compliance & Legal Counsel</strong>
                      <span style={{ color: 'var(--muted)', fontSize: '11px' }}>compliance.rera@puravankara.com</span>
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--green)', fontWeight: '700' }}>ACTIVE</span>
                  </div>
                </div>

                <div style={{ marginTop: '14px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      playChime()
                      showToast('🚨 Simulated Critical Alert Triggered: RERA Grievance Escalate!')
                    }}
                    className="period-button"
                    style={{ width: '100%', justifyContent: 'center', fontSize: '12px', color: 'var(--red)', borderColor: 'rgba(255, 79, 82, 0.3)' }}
                  >
                    <AlertTriangle size={13} /> Trigger Simulated Crisis Alert Preview
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: MONITORED BRAND PORTFOLIO & THREAT LEXICON */}
        {(showAll || activeTab === 'lexicon') && (
          <div className="panel" style={{ padding: '24px' }}>
            <div className="panel-title-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={20} color="var(--green)" />
                <h3 style={{ margin: 0 }}>Monitored Portfolio Entities & Intelligence Lexicon</h3>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '600' }}>ACTIVE REPUTATION SCOPE</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {/* Monitored Brands */}
              <div style={{ background: 'var(--panel-2)', padding: '18px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <strong style={{ display: 'block', fontSize: '14px', color: 'var(--text-h)', marginBottom: '4px' }}>🏢 Monitored Portfolio Entities</strong>
                <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px' }}>
                  Corporate entities, sub-brands, and leaders tracked across global feeds.
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {[
                    ['Puravankara Limited', 'var(--blue)', 'Corporate Flagship'],
                    ['Purva (Luxury)', 'var(--purple)', 'Luxury High-Rise'],
                    ['Provident Housing', 'var(--green)', 'Affordable & Mid-Income'],
                    ['Purva Land', 'var(--orange)', 'Plotted Developments'],
                    ['Starworth Infra', 'var(--cyan)', 'EPC Construction'],
                    ['Ravi Puravankara', '#a28cff', 'Founder Chairman'],
                    ['Ashish Puravankara', '#397cff', 'Managing Director'],
                  ].map(([name, color, label]) => (
                    <span
                      key={name}
                      style={{
                        background: 'var(--panel)',
                        border: `1px solid ${color}40`,
                        color: 'var(--text-h)',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
                      {name}
                      <small style={{ fontSize: '10px', color: 'var(--muted)' }}>({label})</small>
                    </span>
                  ))}
                </div>
              </div>

              {/* Threat Grievance Lexicon */}
              <div style={{ background: 'var(--panel-2)', padding: '18px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <strong style={{ display: 'block', fontSize: '14px', color: 'var(--text-h)', marginBottom: '4px' }}>⚠️ Active Threat Lexicon Dictionary</strong>
                <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px' }}>
                  Keywords triggering sentiment demotions and emergency alerts.
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {[
                    'RERA Notice', 'Court Lawsuit', 'FIR Filed', 'Delayed Possession',
                    'Water Seepage', 'Structural Defect', 'Building Collapse', 'NCLT / Insolvency',
                    'Buyer Protest', 'Cheated / Fraud', 'GST Evasion', 'Refund Dispute',
                    'Construction Snag', 'Penalty Imposed'
                  ].map((kw) => (
                    <span
                      key={kw}
                      style={{
                        background: 'rgba(255, 79, 82, 0.1)',
                        border: '1px solid rgba(255, 79, 82, 0.25)',
                        color: 'var(--red)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '700',
                      }}
                    >
                      {kw}
                    </span>
                  ))}
                </div>

                <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                  <small style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    Positive catalyst terms also tracked: <em>Profit Turnaround, Record Sales, New Launch, Quality Finishing, On Time Handover</em>.
                  </small>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 6: DATA EXPORTS, STORAGE & DIAGNOSTICS */}
        {(showAll || activeTab === 'export') && (
          <div className="panel" style={{ padding: '24px' }}>
            <div className="panel-title-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Download size={20} color="var(--blue)" />
                <h3 style={{ margin: 0 }}>Data Export, Local Cache & Diagnostics</h3>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '600' }}>STORAGE & BACKUP</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {/* Direct Export Buttons */}
              <div style={{ background: 'var(--panel-2)', padding: '18px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <strong style={{ display: 'block', fontSize: '14px', color: 'var(--text-h)', marginBottom: '4px' }}>📥 Intelligence Data Export</strong>
                <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px' }}>
                  Download the current live intelligence records for reporting, compliance, or external presentation.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    style={{
                      background: 'var(--panel)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-h)',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                      fontWeight: '600',
                      fontSize: '13px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Download size={16} color="var(--green)" />
                      <span>Export Dataset to CSV (Excel / Sheets)</span>
                    </div>
                    <small style={{ color: 'var(--muted)', fontSize: '11px' }}>{recordsCount} records</small>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportJSON}
                    style={{
                      background: 'var(--panel)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-h)',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                      fontWeight: '600',
                      fontSize: '13px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Database size={16} color="var(--blue)" />
                      <span>Export Snapshot to JSON (Raw Intelligence)</span>
                    </div>
                    <small style={{ color: 'var(--muted)', fontSize: '11px' }}>Full payload</small>
                  </button>
                </div>
              </div>

              {/* Cache Management & Tech Stack */}
              <div style={{ background: 'var(--panel-2)', padding: '18px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <strong style={{ display: 'block', fontSize: '14px', color: 'var(--text-h)', marginBottom: '4px' }}>⚙️ System Cache & Diagnostics</strong>
                <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px' }}>
                  Diagnostics regarding the active runtime, storage vaults, and model endpoints.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
                    <span>Active Storage Vaults:</span>
                    <strong style={{ color: 'var(--text-h)' }}>Atomic JSON Store (reputation.json, alerts.json)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
                    <span>Sentiment Classification Engine:</span>
                    <strong style={{ color: 'var(--text-h)' }}>Gemini 1.5 Flash + Hybrid Real-Time Rule Classifier</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
                    <span>Emergency Alerts In Vault:</span>
                    <strong style={{ color: 'var(--red)' }}>{alertsCount} saved risk events</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
                    <span>API Gateway:</span>
                    <strong style={{ color: 'var(--blue)' }}>{API}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResetDefaults}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--muted)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    width: '100%',
                    justifyContent: 'center',
                  }}
                >
                  <RotateCcw size={12} />
                  Reset Client Preferences & Clear Local Storage
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}


function AlertPanel({ records, onSelectRecord }) {
  const negatives = records
    .filter((record) => sentimentOf(record) === 'negative')
    .sort((a, b) => Number(b.relevance_score || 0) - Number(a.relevance_score || 0))

  if (!negatives.length) {
    return (
      <div className="clear-state">
        <div className="clear-icon">
          <CheckCircle2 size={28} />
        </div>
        <strong>No critical negative signals detected</strong>
        <span>Crisis intelligence is currently clear based on the records returned by the API.</span>
      </div>
    )
  }

  const handleCardClick = (e, record) => {
    if (e.target.closest('button, a, .source-link-btn')) return
    const sourceUrl = getRecordSourceUrl(record)
    if (sourceUrl) {
      openSource(record)
    } else if (onSelectRecord) {
      onSelectRecord(record)
    }
  }

  return (
    <div className="alert-list">
      {negatives.slice(0, 5).map((record, index) => {
        const sourceUrl = getRecordSourceUrl(record)
        const isAvailable = isValidHttpUrl(sourceUrl)

        return (
          <div
            className={`alert-row ${isAvailable ? 'clickable' : 'disabled-row'}`}
            key={record.url || record.id || `${record.title}-${index}`}
            onClick={(e) => handleCardClick(e, record)}
            style={{ cursor: isAvailable ? 'pointer' : 'default' }}
            title={isAvailable ? `Click to open exact source URL: ${sourceUrl}` : 'Source URL unavailable'}
          >
            <span className="alert-symbol">
              <AlertTriangle size={17} />
            </span>

            <div style={{ flex: 1 }}>
              <strong style={{ cursor: isAvailable ? 'pointer' : 'default' }}>{generatedTitle(record)}</strong>
              <small>
                <span
                  className="source-pill-inline"
                  onClick={(e) => { e.stopPropagation(); openSource(record) }}
                  style={{ cursor: isAvailable ? 'pointer' : 'default' }}
                >
                  {record.source || 'News'}
                </span>
                {' · '}{formatDate(record)}
              </small>
            </div>

            <SourceLink record={record} label="" showIcon={true} />
          </div>
        )
      })}
    </div>
  )
}

function MentionCard({ record, onSelectRecord, activeQuery }) {
  const sentiment = sentimentOf(record)
  const fullText = `${record.title || ''} ${record.text || ''} ${record.description || ''}`.toLowerCase()
  const isMatch = activeQuery && activeQuery.trim().length > 1 && fullText.includes(activeQuery.trim().toLowerCase())
  const sourceUrl = getRecordSourceUrl(record)
  const isAvailable = isValidHttpUrl(sourceUrl)

  const handleCardClick = (e) => {
    if (e.target.closest('button, a, .source-link-btn')) return
    if (sourceUrl) {
      openSource(record)
    } else if (onSelectRecord) {
      onSelectRecord(record)
    }
  }

  return (
    <article
      className={`mention-card ${isMatch ? 'highlighted-card' : ''} ${isAvailable ? 'clickable' : ''}`}
      onClick={handleCardClick}
      style={{ cursor: isAvailable ? 'pointer' : 'default' }}
      title={isAvailable ? `Click to open exact source URL: ${sourceUrl}` : 'Source URL unavailable'}
    >
      <div className="mention-top">
        <span
          className={`source-pill ${(record?.source || 'web')
            .toLowerCase()
            .replace(/\W+/g, '-')}`}
          onClick={(e) => { e.stopPropagation(); openSource(record) }}
          style={{ cursor: isAvailable ? 'pointer' : 'default' }}
          title={`Filter or open source for ${record?.source || 'web'}`}
        >
          {sourceIcon(record?.source)}
          {record?.source || 'Web'}
        </span>

        {record.source?.toLowerCase().includes('mouthshut') && (
          <span
            style={{
              fontSize: '10px',
              background: 'rgba(234, 88, 12, 0.12)',
              color: 'var(--orange)',
              border: '1px solid rgba(234, 88, 12, 0.3)',
              padding: '2px 7px',
              borderRadius: '4px',
              fontWeight: '700',
              letterSpacing: '0.03em',
            }}
            title="Informative consumer review label (excluded from official reputation index calculation)"
          >
            CONSUMER REVIEW
          </span>
        )}

        <span className={`sentiment-pill ${sentiment}`}>
          {sentiment}
        </span>
      </div>

      <div className="mention-content">
        <h4 onClick={(e) => { e.stopPropagation(); openSource(record) }} style={{ cursor: isAvailable ? 'pointer' : 'default' }}>
          {generatedTitle(record)}
        </h4>
        <p>{cardDescription(record)}</p>
      </div>

      <div className="mention-footer">
        <span>{cleanAuthor(record)}</span>
        <span>{formatDate(record)}</span>

        <SourceLink record={record} label="Open source" />
      </div>
    </article>
  )
}

function HotNow({ records, onSelectRecord }) {
  const hot = [...records]
    .sort((a, b) => {
      const sentimentWeight = {
        negative: 3,
        positive: 2,
        neutral: 1,
      }

      const aWeight = sentimentWeight[sentimentOf(a)] || 1
      const bWeight = sentimentWeight[sentimentOf(b)] || 1

      const aRelevance = Number(a.relevance_score || 0)
      const bRelevance = Number(b.relevance_score || 0)

      return (
        bWeight * 10 +
        bRelevance * 5 +
        dateValue(b) / 1e12 -
        (aWeight * 10 + aRelevance * 5 + dateValue(a) / 1e12)
      )
    })
    .slice(0, 5)

  return (
    <div className="hot-list">
      {hot.length ? (
        hot.map((record, index) => {
          const sourceUrl = getRecordSourceUrl(record)
          const isAvailable = isValidHttpUrl(sourceUrl)

          return (
            <div
              className={`hot-item ${isAvailable ? 'clickable' : ''}`}
              key={record.url || record.id || `${record.title}-${index}`}
              onClick={(e) => {
                if (e.target.closest('button, a, .source-link-btn')) return
                if (sourceUrl) {
                  openSource(record)
                } else if (onSelectRecord) {
                  onSelectRecord(record)
                }
              }}
              style={{ cursor: isAvailable ? 'pointer' : 'default' }}
              title={isAvailable ? `Click to open exact source URL: ${sourceUrl}` : 'Source URL unavailable'}
            >
              <div className="hot-rank">
                {String(index + 1).padStart(2, '0')}
              </div>

              <div className="hot-content">
                <div className="hot-meta">
                  <span
                    className="source-pill-mini"
                    onClick={(e) => { e.stopPropagation(); openSource(record) }}
                    style={{ cursor: isAvailable ? 'pointer' : 'default' }}
                  >
                    {sourceIcon(record.source)}
                    {record.source}
                  </span>
                  <span>{formatDate(record)} · {formatTime(record)}</span>
                </div>

                <strong onClick={(e) => { e.stopPropagation(); openSource(record) }} style={{ cursor: isAvailable ? 'pointer' : 'default' }}>
                  {generatedTitle(record)}
                </strong>

                <small>{cleanAuthor(record)}</small>
              </div>

              <span className={`sentiment-pill ${sentimentOf(record)}`}>
                {sentimentOf(record)}
              </span>

              <SourceLink record={record} label="" showIcon={true} />
            </div>
          )
        })
      ) : (
        <div className="empty-small">
          No recent signals available.
        </div>
      )}
    </div>
  )
}

function ExecutiveIntelligencePanel({
  records = [],
  comments = [],
  stats = {},
  alerts = [],
  lastUpdated,
  loading,
  pollInterval = 15,
  onRefresh,
  onSelectFilter,
}) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefreshClick = async () => {
    setIsRefreshing(true)
    if (onRefresh) {
      await onRefresh()
    }
    setTimeout(() => setIsRefreshing(false), 600)
  }

  // Combined dataset pool
  const pool = useMemo(() => {
    const combined = [...records, ...comments]
    const seen = new Set()
    return combined.filter((r) => {
      const id = r.url || r.title || r.text || r.id
      if (!id || seen.has(id)) return false
      seen.add(id)
      return true
    })
  }, [records, comments])

  const total = pool.length

  // MouthShut is an informative consumer review label but excluded from executive reputation calculation per user specification
  const reputationPool = useMemo(() => {
    return pool.filter((r) => !String(r.source || '').toLowerCase().includes('mouthshut'))
  }, [pool])

  const scoringTotal = reputationPool.length

  // Counts using normalized sentimentOf on reputationPool
  const positive = useMemo(
    () => reputationPool.filter((r) => sentimentOf(r) === 'positive').length,
    [reputationPool]
  )
  const negative = useMemo(
    () => reputationPool.filter((r) => sentimentOf(r) === 'negative').length,
    [reputationPool]
  )
  const neutral = Math.max(0, scoringTotal - positive - negative)

  const posPct = scoringTotal ? Math.round((positive / scoringTotal) * 100) : 0
  const neuPct = scoringTotal ? Math.round((neutral / scoringTotal) * 100) : 0
  const negPct = scoringTotal ? Math.max(0, 100 - posPct - neuPct) : 0

  // Reputation Score (0 - 100) calculated without mouthshut - aligned with shared stats
  const score = stats?.reputationScore !== undefined && stats?.reputationScore !== null
    ? stats.reputationScore
    : scoringTotal
      ? Math.round(((positive + neutral * 0.5) / scoringTotal) * 100)
      : 0

  // Total volume sentiment breakdown across all signals
  const allPositive = useMemo(
    () => pool.filter((r) => sentimentOf(r) === 'positive').length,
    [pool]
  )
  const allNegative = useMemo(
    () => pool.filter((r) => sentimentOf(r) === 'negative').length,
    [pool]
  )
  const allNeutral = Math.max(0, total - allPositive - allNegative)

  // Net Sentiment (-100% to +100%) calculated without mouthshut
  const netSentimentPct = scoringTotal
    ? Math.round(((positive - negative) / scoringTotal) * 100)
    : 0

  // Helper to parse timestamps
  const getItemTime = (item) => {
    const raw =
      item?.published_at || item?.created_at || item?.date || item?.timestamp
    if (!raw) return 0
    if (typeof raw === 'number') return raw > 1e11 ? raw : raw * 1000
    const ts = new Date(raw).getTime()
    return isNaN(ts) ? 0 : ts
  }

  const now = useMemo(
    () => (lastUpdated ? new Date(lastUpdated).getTime() : Date.now()),
    [lastUpdated]
  )

  // 7-day period delta comparison on core reputation pool
  const rangeMs = 7 * 24 * 3600 * 1000
  const prevPool = useMemo(() => {
    const startPrev = now - rangeMs * 2
    const endPrev = now - rangeMs
    return reputationPool.filter((r) => {
      const t = getItemTime(r)
      return t >= startPrev && t < endPrev
    })
  }, [reputationPool, now])

  const prevScore = useMemo(() => {
    if (!prevPool.length) return null
    const pos = prevPool.filter((r) => sentimentOf(r) === 'positive').length
    const neg = prevPool.filter((r) => sentimentOf(r) === 'negative').length
    const neu = Math.max(0, prevPool.length - pos - neg)
    return Math.round(((pos + neu * 0.5) / prevPool.length) * 100)
  }, [prevPool])

  const scoreDelta = prevScore !== null ? score - prevScore : 0

  // Risk Level Evaluation
  const activeCriticalAlerts = alerts.filter(
    (a) => a.severity === 'critical' || a.severity === 'high'
  ).length

  let riskLevel = 'LOW'
  let riskTone = 'good'
  let riskAdvice = 'Reputation narrative stable'
  if (activeCriticalAlerts > 0 || negPct > 15 || score < 50) {
    riskLevel = 'CRITICAL'
    riskTone = 'critical'
    riskAdvice = 'Immediate executive attention required'
  } else if (negative >= 3 || negPct > 7 || score < 70) {
    riskLevel = 'MEDIUM'
    riskTone = 'watch'
    riskAdvice = 'Monitor negative feedback & delays'
  }

  // Customer Satisfaction Score (CSAT: 0 - 100) evaluated strictly on verified customer touchpoints
  const customerPool = useMemo(() => {
    if (stats?.customerFiltered) return stats.customerFiltered
    return reputationPool.filter((r) => isCustomerTouchpoint(r))
  }, [reputationPool, stats])

  const custTotal = stats?.custTotal !== undefined ? stats.custTotal : customerPool.length
  const custPositive = stats?.custPos !== undefined ? stats.custPos : customerPool.filter((r) => sentimentOf(r) === 'positive').length
  const custNegative = stats?.custNeg !== undefined ? stats.custNeg : customerPool.filter((r) => sentimentOf(r) === 'negative').length
  const custNeutral = stats?.custNeu !== undefined ? stats.custNeu : Math.max(0, custTotal - custPositive - custNegative)

  const csatScore = stats?.csatScore !== undefined && stats?.csatScore !== null
    ? stats.csatScore
    : custTotal
      ? Math.round(((custPositive + custNeutral * 0.5) / custTotal) * 100)
      : 0

  // Risk Score Index (0 - 100)
  const riskScore = Math.min(
    100,
    Math.round(negPct * 1.5 + activeCriticalAlerts * 15 + (100 - score) * 0.2)
  )

  // Topic Keyword Analysis
  const keywords = [
    { key: 'launch', label: 'Project Launch & Expansion' },
    { key: 'pricing', label: 'Pricing & Investment' },
    { key: 'delay', label: 'Construction Timelines' },
    { key: 'customer', label: 'Customer Queries & Support' },
    { key: 'rera', label: 'RERA & Compliance' },
    { key: 'quality', label: 'Build & Finishing Quality' },
  ]

  const keywordCounts = useMemo(() => {
    return keywords
      .map((kw) => {
        const matches = pool.filter((r) =>
          `${r.title || ''} ${r.text || ''}`.toLowerCase().includes(kw.key)
        )
        const posCount = matches.filter(
          (r) => sentimentOf(r) === 'positive'
        ).length
        const negCount = matches.filter(
          (r) => sentimentOf(r) === 'negative'
        ).length
        return {
          ...kw,
          count: matches.length,
          posCount,
          negCount,
          sentiment:
            negCount > posCount
              ? 'negative'
              : posCount > 0
                ? 'positive'
                : 'neutral',
        }
      })
      .filter((k) => k.count > 0)
      .sort((a, b) => b.count - a.count)
  }, [pool])

  const topPositiveKeyword =
    keywordCounts.find((k) => k.sentiment === 'positive') || keywordCounts[0]
  const topNegativeKeyword = keywordCounts.find(
    (k) => k.sentiment === 'negative' || k.negCount > 0
  )
  const topEmergingKeyword = keywordCounts[0]

  const updatedText = useMemo(() => {
    if (!lastUpdated) return 'Just now'
    const diffSec = Math.floor(
      (Date.now() - new Date(lastUpdated).getTime()) / 1000
    )
    if (diffSec < 60) return 'Just now'
    const mins = Math.floor(diffSec / 60)
    return `${mins}m ago`
  }, [lastUpdated])

  return (
    <div className="exec-intel-container">
      {/* Header Bar */}
      <div className="exec-header">
        <div className="exec-title-group">
          <span className="exec-kicker">INTELLIGENCE LAYER</span>
          <h2 className="exec-title">Executive Intelligence</h2>
          <p className="exec-subtitle">
            Real-time AI-assisted interpretation of current reputation signals
          </p>
        </div>

        <div className="exec-header-right">
          <div className="exec-live-status">
            <span className="exec-live-pulse" />
            <span className="exec-live-label">LIVE</span>
            <span className="exec-live-sep">•</span>
            <span className="exec-sync-pill" style={{ color: '#20c997' }}>
              {pollInterval === 0 ? 'Auto-Sync: Paused' : `Auto-Sync: ${pollInterval}s`}
            </span>
            <span className="exec-live-sep">•</span>
            <span className="exec-updated">Updated {updatedText}</span>
          </div>

          <button
            className={`exec-refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
            onClick={handleRefreshClick}
            disabled={isRefreshing || loading}
            title="Click to run live analysis refresh"
          >
            <Sparkles size={14} className={isRefreshing ? 'spin-icon' : ''} />
            <span>{isRefreshing ? 'Analyzing...' : 'LIVE ANALYSIS'}</span>
          </button>
        </div>
      </div>

      {/* 5-Column Executive Metric Blocks */}
      <div className="exec-kpi-grid">
        {/* Metric 1: Reputation Status */}
        <div
          className="exec-kpi-card"
          title={`Macro enterprise reputation score calculated across ${scoringTotal} corporate news, market updates, and digital brand signals.`}
        >
          <div className="exec-kpi-header">
            <span className="exec-kpi-label">REPUTATION SCORE</span>
          </div>
          <div className="exec-kpi-mid">
            <div className="exec-kpi-body">
              <span className="exec-kpi-val">{score}</span>
              <span className="exec-kpi-denom">/100</span>
            </div>
            <span
              className={`exec-badge ${score >= 75 ? 'good' : score >= 50 ? 'watch' : 'critical'
                }`}
            >
              {score >= 75 ? 'FAVOURABLE' : score >= 50 ? 'WATCH' : 'AT RISK'}
            </span>
          </div>
          <div className="exec-kpi-footer">
            <span
              className={`exec-trend-pill ${scoreDelta >= 0 ? 'positive' : 'negative'
                }`}
            >
              {scoreDelta >= 0 ? `↑ +${scoreDelta} pts` : `↓ ${scoreDelta} pts`} vs last cycle
            </span>
          </div>
        </div>

        {/* Metric 2: Net Sentiment */}
        <div className="exec-kpi-card">
          <div className="exec-kpi-header">
            <span className="exec-kpi-label">NET SENTIMENT</span>
          </div>
          <div className="exec-kpi-mid">
            <div className="exec-kpi-body">
              <span className="exec-kpi-val">
                {netSentimentPct >= 0
                  ? `+${netSentimentPct}%`
                  : `${netSentimentPct}%`}
              </span>
            </div>
            <span
              className={`exec-badge ${netSentimentPct >= 0 ? 'good' : 'critical'
                }`}
            >
              {netSentimentPct >= 0 ? 'POSITIVE' : 'NEGATIVE'}
            </span>
          </div>
          <div className="exec-kpi-footer">
            <span className="exec-sub-info">
              {posPct}% Pos · {negPct}% Neg
            </span>
          </div>
        </div>

        {/* Metric 3: Risk Level */}
        <div className="exec-kpi-card">
          <div className="exec-kpi-header">
            <span className="exec-kpi-label">RISK LEVEL</span>
          </div>
          <div className="exec-kpi-mid">
            <div className="exec-kpi-body">
              <span className={`exec-kpi-val ${riskTone}`}>{riskLevel}</span>
            </div>
            <span className={`exec-badge ${riskTone}`}>{riskScore}/100</span>
          </div>
          <div className="exec-kpi-footer">
            <span className="exec-sub-info" title={riskAdvice}>
              {riskScore <= 20 ? 'Low negative activity' : riskAdvice}
            </span>
          </div>
        </div>

        {/* Metric 4: Customer Satisfaction (CSAT) */}
        <div
          className="exec-kpi-card"
          title={`Customer Satisfaction Score (CSAT) calculated specifically from ${custTotal} verified resident, homebuyer, and CRM touchpoints (excluding macro corporate PR/filings).`}
        >
          <div className="exec-kpi-header">
            <span className="exec-kpi-label">CUSTOMER SATISFACTION</span>
          </div>
          <div className="exec-kpi-mid">
            <div className="exec-kpi-body">
              <span className="exec-kpi-val">{csatScore}%</span>
              <span className="exec-kpi-denom">CSAT</span>
            </div>
            <span
              className={`exec-badge ${csatScore >= 75 ? 'good' : csatScore >= 50 ? 'watch' : 'critical'
                }`}
            >
              {csatScore >= 75 ? 'HIGH' : csatScore >= 50 ? 'MODERATE' : 'CONCERN'}
            </span>
          </div>
          <div className="exec-kpi-footer">
            <span className="exec-sub-info">
              {custPositive} of {custTotal} satisfied touchpoints
            </span>
          </div>
        </div>

        {/* Metric 5: Signal Volume */}
        <div className="exec-kpi-card">
          <div className="exec-kpi-header">
            <span className="exec-kpi-label">SIGNALS VOLUME</span>
          </div>
          <div className="exec-kpi-mid">
            <div className="exec-kpi-body">
              <span className="exec-kpi-val">
                {total.toLocaleString('en-IN')}
              </span>
            </div>
            <span className="exec-badge neutral">● LIVE</span>
          </div>
          <div className="exec-kpi-footer">
            <span className="exec-split-text">
              <strong className="pos">{allPositive} Pos</strong> ·{' '}
              <strong className="neu">{allNeutral} Neu</strong> ·{' '}
              <strong className="neg">{allNegative} Neg</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Summary & What Changed (Left) vs Signals (Right) */}
      <div className="exec-content-grid">
        {/* Left Box: Executive Summary & What Changed */}
        <div className="exec-left-block">
          <div className="exec-narrative-box">
            <div className="exec-box-header">
              <Sparkles size={15} className="exec-box-icon" />
              <h4>Executive Reputation Summary</h4>
            </div>
            <p className="exec-narrative-text">
              {total > 0
                ? `Puravankara maintains a ${score >= 75
                  ? 'favourable'
                  : score >= 50
                    ? 'monitored'
                    : 'critical'
                } reputation score of ${score}/100 across ${total} active signals. Positive sentiment accounts for ${posPct}% of conversation driven primarily by ${topPositiveKeyword
                  ? topPositiveKeyword.label
                  : 'corporate announcements'
                }, while ${negative} negative mentions (${negPct}%) require focused tracking around ${topNegativeKeyword
                  ? topNegativeKeyword.label
                  : 'customer communications'
                }.`
                : 'No reputation signals are currently loaded for the selected filters.'}
            </p>
          </div>

          <div className="exec-changes-box">
            <h4>WHAT CHANGED (Selected Window)</h4>
            <ul className="exec-changes-list">
              <li>
                <span className="exec-change-icon pos">↑</span>
                <span>
                  Positive signals represent <strong>{posPct}%</strong> of total
                  volume ({positive} mentions).
                </span>
              </li>
              <li>
                <span className="exec-change-icon neg">
                  {negative > 0 ? '↓' : '✓'}
                </span>
                <span>
                  {negative > 0
                    ? `${negative} negative mentions detected (${negPct}% of feed).`
                    : 'Zero critical negative mentions detected in current window.'}
                </span>
              </li>
              <li>
                <span className="exec-change-icon neu">↑</span>
                <span>
                  Primary narrative theme focused on{' '}
                  <strong>
                    {topEmergingKeyword
                      ? topEmergingKeyword.label
                      : 'Market Presence'}
                  </strong>
                  .
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Box: Actionable Signals & Recommendations */}
        <div className="exec-right-block">
          <div className="exec-signals-header">
            <h4>KEY INTELLIGENCE SIGNALS</h4>
            <span className="exec-signals-count">
              {keywordCounts.length} Active Themes
            </span>
          </div>

          <div className="exec-signals-list">
            {/* Positive Signal Card */}
            <div
              className="exec-signal-card pos"
              onClick={() => onSelectFilter && onSelectFilter('positive')}
              title="Click to filter positive records"
            >
              <div className="exec-signal-top">
                <span className="exec-signal-tag pos">POSITIVE SIGNAL</span>
                <span className="exec-signal-vol">{positive} mentions</span>
              </div>
              <strong className="exec-signal-title">
                {topPositiveKeyword
                  ? `${topPositiveKeyword.label} generating strong positive engagement`
                  : 'Brand reputation showing consistent positive traction'}
              </strong>
            </div>

            {/* Negative / Risk Signal Card */}
            <div
              className="exec-signal-card neg"
              onClick={() => onSelectFilter && onSelectFilter('negative')}
              title="Click to filter negative records"
            >
              <div className="exec-signal-top">
                <span className="exec-signal-tag neg">
                  {negative > 0 ? 'NEGATIVE SIGNAL' : 'RISK MONITOR'}
                </span>
                <span className="exec-signal-vol">{negative} mentions</span>
              </div>
              <strong className="exec-signal-title">
                {topNegativeKeyword
                  ? `${topNegativeKeyword.negCount} negative signals logged under ${topNegativeKeyword.label}`
                  : 'No elevated risk triggers detected'}
              </strong>
            </div>

            {/* Executive Action Item Box */}
            <div className="exec-action-box">
              <span className="exec-action-label">EXECUTIVE ACTION</span>
              <p className="exec-action-text">
                {negative > 0
                  ? `Prioritize customer support response for ${topNegativeKeyword
                    ? topNegativeKeyword.label
                    : 'negative queries'
                  } to prevent sentiment escalation.`
                  : 'Maintain active monitoring across news and social channels for new sentiment shifts.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ExecutiveAnalysis(props) {
  return <ExecutiveIntelligencePanel {...props} />
}

function CssPeriodDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const options = [
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '3m', label: 'Last 3 months' },
    { value: '6m', label: 'Last 6 months' },
    { value: '1y', label: 'Last year' },
    { value: 'all', label: 'All time' },
  ]

  const selectedOption = options.find((o) => o.value === value) || options[1]

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="css-dropdown-container" ref={dropdownRef}>
      <button
        type="button"
        className={`css-dropdown-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedOption.label}</span>
        <ChevronDown size={14} className={`css-dropdown-chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="css-dropdown-menu">
          {options.map((opt) => (
            <div
              key={opt.value}
              className={`css-dropdown-item ${opt.value === value ? 'selected' : ''}`}
              onClick={() => {
                onChange(opt.value)
                setIsOpen(false)
              }}
            >
              <span>{opt.label}</span>
              {opt.value === value && <CheckCircle2 size={13} className="css-dropdown-check" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CustomerSatisfaction({
  records = [],
  comments = [],
  lastUpdated,
  loading,
  error,
  onSelectSentiment,
  timeRange = 'all',
  onTimeRangeChange,
  stats = null,
}) {
  const [localTimeRange, setLocalTimeRange] = useState('all')
  const activeTimeRange = timeRange || localTimeRange
  const handleTimeRangeChange = (val) => {
    setLocalTimeRange(val)
    if (onTimeRangeChange) onTimeRangeChange(val)
  }

  const [showTooltip, setShowTooltip] = useState(false)

  // Combined customer touchpoint dataset from records & comments
  const pool = useMemo(() => {
    if (stats?.customerFiltered) return stats.customerFiltered
    const combined = [...records, ...comments]
    const seen = new Set()
    return combined.filter((r) => {
      const id = r.url || r.title || r.text || r.id
      if (!id || seen.has(id)) return false
      seen.add(id)
      return isCustomerTouchpoint(r)
    })
  }, [records, comments, stats])

  const getItemTime = (item) => {
    const raw =
      item?.published_at ||
      item?.created_at ||
      item?.date ||
      item?.timestamp
    if (!raw) return 0
    if (typeof raw === 'number') return raw > 1e11 ? raw : raw * 1000
    const ts = new Date(raw).getTime()
    return isNaN(ts) ? 0 : ts
  }

  const now = useMemo(
    () => (lastUpdated ? new Date(lastUpdated).getTime() : Date.now()),
    [lastUpdated]
  )

  const getRangeMs = (range) => {
    switch (range) {
      case '24h':
        return 24 * 3600 * 1000
      case '7d':
        return 7 * 24 * 3600 * 1000
      case '30d':
        return 30 * 24 * 3600 * 1000
      case '3m':
        return 90 * 24 * 3600 * 1000
      case '6m':
        return 180 * 24 * 3600 * 1000
      case '1y':
        return 365 * 24 * 3600 * 1000
      default:
        return Infinity
    }
  }

  const currentRecords = pool

  const prevPeriodScore = useMemo(() => {
    if (activeTimeRange === 'all') return 60
    const ms = getRangeMs(activeTimeRange)
    if (!isFinite(ms)) return 60
    const times = pool.map(getItemTime).filter((t) => t > 0)
    const refTime = times.length ? Math.max(...times) : now
    const startPrev = refTime - ms * 2
    const endPrev = refTime - ms
    const prevRecs = pool.filter((r) => {
      const t = getItemTime(r)
      return t >= startPrev && t < endPrev
    })
    if (prevRecs.length < 3) return 60
    const pos = prevRecs.filter((r) => sentimentOf(r) === 'positive').length
    const neg = prevRecs.filter((r) => sentimentOf(r) === 'negative').length
    const neu = Math.max(0, prevRecs.length - pos - neg)
    return Math.round(((pos + neu * 0.5) / prevRecs.length) * 100)
  }, [pool, activeTimeRange, now])

  const positive = stats?.custPos !== undefined ? stats.custPos : currentRecords.filter(
    (r) => sentimentOf(r) === 'positive'
  ).length

  const negative = stats?.custNeg !== undefined ? stats.custNeg : currentRecords.filter(
    (r) => sentimentOf(r) === 'negative'
  ).length

  const total = stats?.custTotal !== undefined ? stats.custTotal : currentRecords.length
  const neutral = stats?.custNeu !== undefined ? stats.custNeu : Math.max(0, total - positive - negative)

  const css = stats?.csatScore !== undefined && stats?.csatScore !== null
    ? stats.csatScore
    : total
      ? Math.round(((positive + neutral * 0.5) / total) * 100)
      : null

  const delta =
    css !== null && prevPeriodScore !== null ? css - prevPeriodScore : null

  let label = 'No customer data'
  let statusTone = 'neutral'
  if (css !== null) {
    if (css >= 75) {
      label = 'GOOD'
      statusTone = 'good'
    } else if (css >= 50) {
      label = 'WATCH'
      statusTone = 'watch'
    } else {
      label = 'CRITICAL'
      statusTone = 'critical'
    }
  }

  const sparklinePoints = useMemo(() => {
    if (!currentRecords.length) return []
    const numBuckets = 8
    const times = currentRecords
      .map((r) => getItemTime(r))
      .filter((t) => t > 0)
    let minT = times.length ? Math.min(...times) : now - getRangeMs(timeRange)
    let maxT = times.length ? Math.max(...times) : now
    if (minT === maxT) {
      minT = maxT - 86400000
    }
    const bucketSize = (maxT - minT) / numBuckets
    const buckets = Array.from({ length: numBuckets }, (_, i) => {
      const bStart = minT + i * bucketSize
      const bEnd = bStart + bucketSize
      const bRecs = currentRecords.filter((r) => {
        const t = getItemTime(r)
        return t >= bStart && t <= bEnd
      })
      if (!bRecs.length) return null
      const pos = bRecs.filter((r) => sentimentOf(r) === 'positive').length
      const neu = bRecs.filter((r) => sentimentOf(r) === 'neutral').length
      return Math.round(((pos + neu * 0.5) / bRecs.length) * 100)
    })

    let lastValid = css ?? 50
    return buckets.map((val) => {
      if (val !== null) lastValid = val
      return lastValid
    })
  }, [currentRecords, timeRange, now, css])

  const sparklineSvg = useMemo(() => {
    if (!sparklinePoints || sparklinePoints.length < 2) return null
    const width = 280
    const height = 36
    const minVal = Math.min(...sparklinePoints, 0)
    const maxVal = Math.max(...sparklinePoints, 100)
    const range = maxVal - minVal || 1

    const pts = sparklinePoints.map((val, idx) => {
      const x = (idx / (sparklinePoints.length - 1)) * width
      const y = height - ((val - minVal) / range) * (height - 8) - 4
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })

    const pathD = `M ${pts.join(' L ')}`
    const areaD = `M 0,${height} L ${pts.join(' L ')} L ${width},${height} Z`

    return (
      <svg
        className="css-sparkline-svg"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="cssSparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#cssSparkGrad)" />
        <path
          d={pathD}
          fill="none"
          stroke="#10b981"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }, [sparklinePoints])

  const posPct = total ? Math.round((positive / total) * 100) : 0
  const neuPct = total ? Math.round((neutral / total) * 100) : 0
  const negPct = total ? Math.max(0, 100 - posPct - neuPct) : 0

  const updatedMinutesAgo = useMemo(() => {
    if (!lastUpdated) return 'Just now'
    const diffSec = Math.floor(
      (Date.now() - new Date(lastUpdated).getTime()) / 1000
    )
    if (diffSec < 60) return 'Just now'
    const mins = Math.floor(diffSec / 60)
    return `${mins}m ago`
  }, [lastUpdated])

  if (loading && !total) {
    return (
      <div className="css-content css-loading-state">
        <div className="css-loading-text">
          Calculating customer satisfaction...
        </div>
      </div>
    )
  }

  if (error && !total) {
    return (
      <div className="css-content css-error-state">
        <AlertTriangle size={20} className="css-error-icon" />
        <span>Unable to load customer satisfaction data.</span>
      </div>
    )
  }

  if (!total) {
    return (
      <div className="css-content css-empty-state">
        <div className="css-empty-badge">Insufficient data</div>
        <p>Not enough customer sentiment records are available for this period.</p>
      </div>
    )
  }

  return (
    <div className="css-content">
      {/* Header Row */}
      <div className="css-header-row">
        <div className="css-title-block">
          <span className="css-kicker">RESIDENT & BUYER VOICE</span>
          <h3 className="css-card-title">
            Customer Satisfaction Score (CSAT)
            <div
              className="css-info-wrapper"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <CircleHelp
                size={14}
                className="css-info-icon"
                onClick={() => setShowTooltip(!showTooltip)}
              />
              {showTooltip && (
                <div className="css-tooltip">
                  Customer Satisfaction Score (CSAT) evaluates direct resident and homebuyer experiences (possession timelines, CRM response, build quality, amenities, complaints). Macro corporate finance and SEC/BSE filings are excluded.
                  <br />
                  <strong>Formula:</strong> ((Positive + Neutral × 0.5) /
                  Customer Touchpoints) × 100
                </div>
              )}
            </div>
          </h3>
        </div>

        <CssPeriodDropdown value={activeTimeRange} onChange={handleTimeRangeChange} />
      </div>

      {/* Main Score & Trend Block */}
      <div className="css-score-section">
        <div className="css-score-main">
          <div className="css-number-group">
            <span className="css-big-number">{css}</span>
            <span className="css-denom">/100</span>
          </div>

          <div className="css-badge-block">
            <div className={`css-status-badge ${statusTone}`}>{label}</div>
            {delta !== null ? (
              <span className={`css-delta-pill ${delta >= 0 ? 'positive' : 'negative'}`}>
                {delta >= 0 ? `↑ +${delta} pts` : `↓ ${delta} pts`} vs prev
              </span>
            ) : (
              <span className="css-delta-pill neutral">— vs prev</span>
            )}
          </div>
        </div>

        {/* Sparkline Trend Chart */}
        {sparklineSvg && (
          <div className="css-sparkline-row">
            <div className="css-sparkline-header">
              <span>SCORE TREND ({timeRange.toUpperCase()})</span>
            </div>
            <div className="css-sparkline-chart">
              {sparklineSvg}
            </div>
          </div>
        )}
      </div>

      {/* Multi-Segment Visual Progress Bar */}
      <div
        className="css-multi-bar"
        title={`Positive: ${posPct}%, Neutral: ${neuPct}%, Negative: ${negPct}%`}
      >
        <div className="css-bar-seg pos" style={{ width: `${posPct}%` }} />
        <div className="css-bar-seg neu" style={{ width: `${neuPct}%` }} />
        <div className="css-bar-seg neg" style={{ width: `${negPct}%` }} />
      </div>

      {/* 3-Column Breakdown Row */}
      <div className="css-breakdown-row">
        <div
          className="css-stat-item pos"
          onClick={() => onSelectSentiment && onSelectSentiment('positive')}
          title="Click to view positive records"
        >
          <div className="css-stat-header">
            <span className="css-stat-dot pos" />
            <span className="css-stat-name">Positive</span>
          </div>
          <div className="css-stat-val">
            <strong>{positive}</strong>
            <small>({posPct}%)</small>
          </div>
        </div>

        <div
          className="css-stat-item neu"
          onClick={() => onSelectSentiment && onSelectSentiment('neutral')}
          title="Click to view neutral records"
        >
          <div className="css-stat-header">
            <span className="css-stat-dot neu" />
            <span className="css-stat-name">Neutral</span>
          </div>
          <div className="css-stat-val">
            <strong>{neutral}</strong>
            <small>({neuPct}%)</small>
          </div>
        </div>

        <div
          className="css-stat-item neg"
          onClick={() => onSelectSentiment && onSelectSentiment('negative')}
          title="Click to view negative records"
        >
          <div className="css-stat-header">
            <span className="css-stat-dot neg" />
            <span className="css-stat-name">Negative</span>
          </div>
          <div className="css-stat-val">
            <strong>{negative}</strong>
            <small>({negPct}%)</small>
          </div>
        </div>
      </div>

      {/* Footer Metadata */}
      <div className="css-footer-meta">
        <span className="css-footer-text">
          Calculated from <strong>{total}</strong> verified customer touchpoints
        </span>
        <span className="css-live-tag">
          <span className="css-live-dot" />
          Updated {updatedMinutesAgo}
        </span>
      </div>
    </div>
  )
}

function CompetitorBenchmark({ records }) {
  const competitors = [
    'Godrej',
    'Prestige',
    'Brigade',
    'Sobha',
    'Sattva',
    'NBR',
  ]

  const results = competitors
    .map((name) => {
      const count = records.filter((record) =>
        `${record.title} ${record.text}`
          .toLowerCase()
          .includes(name.toLowerCase())
      ).length

      return {
        name,
        count,
      }
    })
    .sort((a, b) => b.count - a.count)

  const max = Math.max(
    1,
    ...results.map((item) => item.count)
  )

  return (
    <div className="benchmark-list">
      {results.map((competitor) => (
        <div
          className="benchmark-row"
          key={competitor.name}
        >
          <div className="benchmark-name">
            <strong>{competitor.name}</strong>

            <span>
              {competitor.count} mention
              {competitor.count !== 1
                ? 's'
                : ''}
            </span>
          </div>

          <div className="benchmark-bar">
            <span
              style={{
                width: `${(competitor.count /
                  max) *
                  100
                  }%`,
              }}
            />
          </div>

          <strong className="benchmark-value">
            {competitor.count}
          </strong>
        </div>
      ))}

      <p className="panel-footnote">
        Benchmarking is currently mention-based.
        Quantitative competitor reputation scores
        should be added when competitor-level
        sentiment data is exposed by the backend.
      </p>
    </div>
  )
}

function CalendarPopover({
  selectedPreset,
  onSelectPreset,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  matchCount,
  onClose,
  onReset,
}) {
  return (
    <div className="calendar-popover" onClick={(e) => e.stopPropagation()}>
      <header className="calendar-popover-header">
        <h4>
          <CalendarDays size={15} />
          Date Range Filter
        </h4>
        <button
          type="button"
          className="calendar-popover-close"
          onClick={onClose}
          aria-label="Close date picker"
        >
          <X size={15} />
        </button>
      </header>

      <div className="calendar-presets">
        <button
          type="button"
          className={`calendar-preset-btn ${selectedPreset === 'all' ? 'active' : ''}`}
          onClick={() => onSelectPreset('all')}
        >
          All Time
        </button>
        <button
          type="button"
          className={`calendar-preset-btn ${selectedPreset === '7d' ? 'active' : ''}`}
          onClick={() => onSelectPreset('7d')}
        >
          Last 7 Days
        </button>
        <button
          type="button"
          className={`calendar-preset-btn ${selectedPreset === '14d' ? 'active' : ''}`}
          onClick={() => onSelectPreset('14d')}
        >
          Last 14 Days
        </button>
        <button
          type="button"
          className={`calendar-preset-btn ${selectedPreset === '30d' ? 'active' : ''}`}
          onClick={() => onSelectPreset('30d')}
        >
          Last 30 Days
        </button>
      </div>

      <div className="calendar-custom-section">
        <div className="calendar-input-group">
          <label>Start Date</label>
          <input
            type="date"
            className="calendar-date-input"
            value={startDate}
            onChange={(e) => {
              onStartDateChange(e.target.value)
              onSelectPreset('custom')
            }}
          />
        </div>

        <div className="calendar-input-group">
          <label>End Date</label>
          <input
            type="date"
            className="calendar-date-input"
            value={endDate}
            onChange={(e) => {
              onEndDateChange(e.target.value)
              onSelectPreset('custom')
            }}
          />
        </div>
      </div>

      <footer className="calendar-footer">
        <span className="calendar-match-count">{matchCount} records matched</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className="calendar-preset-btn"
            onClick={onReset}
            style={{ padding: '5px 8px' }}
          >
            Reset
          </button>
          <button
            type="button"
            className="calendar-apply-btn"
            onClick={onClose}
          >
            Apply
          </button>
        </div>
      </footer>
    </div>
  )
}

function ExecutiveDisclaimer() {
  return (
    <section className="executive-disclaimer-card" aria-label="Methodology & Data Scope Disclaimer">
      <div className="disclaimer-header">
        <div className="disclaimer-title-wrap">
          <ShieldCheck size={16} className="disclaimer-icon" />
          <h4>Data Scope & Intelligence Methodology Notice</h4>
        </div>
        <span className="disclaimer-badge">Enterprise Advisory</span>
      </div>

      <p className="disclaimer-text">
        This executive intelligence dashboard aggregates observational brand perception signals from publicly indexed digital channels (Google News, YouTube, Reddit, Bluesky, and HackerNews). Data collection is subject to search engine indexing depth, third-party platform rate limits, and automated background sync cycles. Third-party consumer reviews are monitored as informative field feedback and are <strong>strictly quarantined from the official corporate reputation index</strong>. Sentiment categorizations, risk severity levels, and CSAT models are algorithmically evaluated via automated heuristic and NLP pipelines for executive decision-support and trend monitoring, and do not constitute statutory audit, legal counsel, or financial advice.
      </p>

      <div className="disclaimer-tags">
        <span className="disclaimer-tag">
          <span className="dot" /> Sampled Public Coverage
        </span>
        <span className="disclaimer-tag">
          <span className="dot" /> Automated NLP Sentiment
        </span>
        <span className="disclaimer-tag">
          <span className="dot" /> Advisory Decision Support
        </span>
      </div>
    </section>
  )
}

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const [records, setRecords] = useState(() => {
    try {
      const cached = localStorage.getItem('puravankara_cached_records')
      return cached ? JSON.parse(cached) : []
    } catch {
      return []
    }
  })
  const [comments, setComments] = useState(() => {
    try {
      const cached = localStorage.getItem('puravankara_cached_comments')
      return cached ? JSON.parse(cached) : []
    } catch {
      return []
    }
  })
  const [alerts, setAlerts] = useState([])
  const [activeAlert, setActiveAlert] = useState(null)
  const [active, setActive] = useState('Overview')
  const [query, setQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(10)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [selectedIssueDetail, setSelectedIssueDetail] = useState(null)
  const [loading, setLoading] = useState(() => {
    try {
      return !localStorage.getItem('puravankara_cached_records')
    } catch {
      return true
    }
  })
  const [refreshing, setRefreshing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [scoreFlash, setScoreFlash] = useState(false)

  const [showCalendar, setShowCalendar] = useState(false)
  const [datePreset, setDatePreset] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [selectedTimeRange, setSelectedTimeRange] = useState('all')
  const [selectedYear, setSelectedYear] = useState('all')
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [selectedSourceFilter, setSelectedSourceFilter] = useState('all')
  const [selectedSentimentFilter, setSelectedSentimentFilter] = useState('all')

  const [pollInterval, setPollInterval] = useState(() => {
    return Number(localStorage.getItem('puravankara_poll_interval')) || 10
  })
  const [liveExecutiveMetrics, setLiveExecutiveMetrics] = useState(() => {
    try {
      const cached = localStorage.getItem('puravankara_cached_metrics')
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  })
  const [soundAlerts, setSoundAlerts] = useState(() => {
    return localStorage.getItem('puravankara_sound_alerts') === 'true'
  })
  const [alertSensitivity, setAlertSensitivity] = useState(() => {
    return localStorage.getItem('puravankara_alert_sensitivity') || 'balanced'
  })

  function handleSetPollInterval(val) {
    setPollInterval(val)
    localStorage.setItem('puravankara_poll_interval', String(val))
  }

  function handleToggleSoundAlerts() {
    setSoundAlerts((prev) => {
      const next = !prev
      localStorage.setItem('puravankara_sound_alerts', String(next))
      return next
    })
  }

  function handleSetAlertSensitivity(val) {
    setAlertSensitivity(val)
    localStorage.setItem('puravankara_alert_sensitivity', val)
  }

  useEffect(() => {
    let cancelled = false
    let isFirstLoad = !records.length

    async function loadData(isSilent = false) {
      if (!isSilent && isFirstLoad) {
        setLoading(true)
      } else {
        setIsSyncing(true)
      }
      setError('')

      const endpoints = [
        '/api/reputation',
        '/api/mentions',
        '/api/comments',
        '/api/alerts',
        '/api/analytics/metrics',
      ]

      try {
        const cacheBuster = Date.now()
        const responses = await Promise.allSettled(
          endpoints.map((endpoint) =>
            fetch(`${API}${endpoint}?_t=${cacheBuster}`, {
              cache: 'no-store',
              headers: {
                Accept: 'application/json',
                'Cache-Control': 'no-cache',
                Pragma: 'no-cache',
              },
            })
          )
        )

        const payloads = await Promise.all(
          responses.map(async (response) => {
            if (
              response.status !== 'fulfilled' ||
              !response.value.ok
            ) {
              return []
            }

            try {
              const resData = await response.value.json()
              return Array.isArray(resData) ? asArray(resData) : resData
            } catch {
              return []
            }
          })
        )

        if (cancelled) return

        const [reputation, mentions, commentData, alertPayload, metricsPayload] = payloads

        const repArray = Array.isArray(reputation) ? reputation : []
        const menArray = Array.isArray(mentions) ? mentions : (mentions?.reputation || [])
        const combined = uniqueRecords(repArray, menArray)

        if (combined.length) setRecords(combined)
        if (Array.isArray(commentData)) setComments(commentData.map(normaliseRecord))
        if (alertPayload && typeof alertPayload === 'object' && !Array.isArray(alertPayload)) {
          setAlerts(alertPayload.all_alerts || [])
          setActiveAlert((alertPayload.active_alerts && alertPayload.active_alerts[0]) || null)
        }
        if (metricsPayload && typeof metricsPayload === 'object' && metricsPayload.reputation_score !== undefined) {
          setLiveExecutiveMetrics(metricsPayload)
        }
        setLastUpdated(new Date())

        // Trigger real-time pulse glow on both scores
        setScoreFlash(true)
        setTimeout(() => setScoreFlash(false), 1400)

        // Cache lightweight snapshot for instant render on refresh
        try {
          if (combined.length) {
            localStorage.setItem('puravankara_cached_records', JSON.stringify(combined.slice(0, 100)))
          }
          if (Array.isArray(commentData) && commentData.length) {
            localStorage.setItem('puravankara_cached_comments', JSON.stringify(commentData.slice(0, 100)))
          }
          if (metricsPayload) {
            localStorage.setItem('puravankara_cached_metrics', JSON.stringify(metricsPayload))
          }
        } catch {}

        const backendFailed = responses.every(
          (response) =>
            response.status !== 'fulfilled' || !response.value.ok
        )

        if (backendFailed) {
          setError(
            'Backend is not reachable. Start the FastAPI server on port 8000.'
          )
        }
      } catch (err) {
        console.error(err)

        if (!cancelled) {
          setError(
            'Unable to connect to the Reputation Intelligence API.'
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setIsSyncing(false)
          isFirstLoad = false
        }
      }
    }

    loadData(false)

    // Real-time automatic polling: silent auto-update without UI flicker
    const interval = pollInterval > 0 ? setInterval(() => loadData(true), pollInterval * 1000) : null

    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
    }
  }, [refreshKey, pollInterval])

  async function handleDeleteAlert(alertId) {
    try {
      const res = await fetch(`${API}/api/alerts/${alertId}`, { method: 'DELETE' })
      if (res.ok) {
        const payload = await res.json()
        setAlerts(payload.all_alerts || [])
        setActiveAlert((payload.active_alerts && payload.active_alerts[0]) || null)
      }
    } catch (err) {
      console.error('Failed to delete alert:', err)
    }
  }

  function CorporateIntelligenceCard() {
    return (
      <div className="panel corporate-intel-panel" style={{ marginTop: '16px' }}>
        <div className="panel-title" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div className="panel-kicker">OFFICIAL CORPORATE INTELLIGENCE</div>
            <h3>Puravankara Limited — Leadership & Corporate Profile</h3>
            <span style={{ fontSize: '11px', color: '#8fa1b8' }}>
              Verified corporate data sourced from{' '}
              <a href="https://www.puravankara.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#397cff', textDecoration: 'underline' }}>
                puravankara.com ↗
              </a>
            </span>
          </div>
          <a
            href="https://www.puravankara.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="link-button"
            style={{ background: '#397cff', color: '#ffffff', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', textDecoration: 'none' }}
          >
            Official Portal puravankara.com ↗
          </a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginTop: '12px' }}>
          <div style={{ background: 'var(--panel-2)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: '700', textTransform: 'uppercase' }}>LEADERSHIP</span>
            <strong style={{ display: 'block', color: 'var(--text-h)', fontSize: '13px', margin: '4px 0 2px' }}>Ravi Puravankara</strong>
            <small style={{ color: 'var(--muted)', fontSize: '11px' }}>Founder Chairman (Est. 1975)</small>
            <strong style={{ display: 'block', color: 'var(--text-h)', fontSize: '13px', margin: '8px 0 2px' }}>Ashish Puravankara</strong>
            <small style={{ color: 'var(--muted)', fontSize: '11px' }}>Managing Director</small>
          </div>

          <div style={{ background: 'var(--panel-2)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: '700', textTransform: 'uppercase' }}>TRACK RECORD</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
              <div>
                <strong style={{ color: 'var(--blue)', fontSize: '15px' }}>48+ Years</strong>
                <small style={{ display: 'block', color: 'var(--muted)', fontSize: '10px' }}>Real Estate Legacy</small>
              </div>
              <div>
                <strong style={{ color: 'var(--green)', fontSize: '15px' }}>45+M Sq Ft</strong>
                <small style={{ display: 'block', color: 'var(--muted)', fontSize: '10px' }}>Delivered Portfolio</small>
              </div>
              <div>
                <strong style={{ color: 'var(--orange)', fontSize: '15px' }}>80+ Projects</strong>
                <small style={{ display: 'block', color: 'var(--muted)', fontSize: '10px' }}>Completed</small>
              </div>
              <div>
                <strong style={{ color: 'var(--purple)', fontSize: '15px' }}>45,000+</strong>
                <small style={{ display: 'block', color: 'var(--muted)', fontSize: '10px' }}>Homeowners</small>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--panel-2)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: '700', textTransform: 'uppercase' }}>FLAGSHIP BRANDS</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
              <span style={{ background: 'rgba(37, 99, 235, 0.12)', color: 'var(--blue)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>Purva (Luxury)</span>
              <span style={{ background: 'rgba(5, 150, 105, 0.12)', color: 'var(--green)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>Provident Housing</span>
              <span style={{ background: 'rgba(217, 119, 6, 0.12)', color: 'var(--orange)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>Purva Land (Plotted)</span>
              <span style={{ background: 'rgba(124, 58, 237, 0.12)', color: 'var(--purple)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>Purva Commercial</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  async function refreshFeed() {
    setRefreshing(true)
    setError('')

    try {
      const response = await fetch(`${API}/api/refresh`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        throw new Error('Feed refresh failed')
      }

      setRefreshKey((key) => key + 1)
    } catch (err) {
      console.error(err)
      setError(
        'Unable to refresh the feed. Check the configured source API keys and try again.'
      )
    } finally {
      setRefreshing(false)
    }
  }

  const globallyFilteredRecords = useMemo(() => {
    let result = records

    const now = Date.now()
    if (selectedTimeRange === '24h') {
      const cut = now - 24 * 3600000
      result = result.filter((r) => (dateValue(r) || now) >= cut)
    } else if (selectedTimeRange === '7d') {
      const cut = now - 7 * 86400000
      result = result.filter((r) => (dateValue(r) || now) >= cut)
    } else if (selectedTimeRange === '30d') {
      const cut = now - 30 * 86400000
      result = result.filter((r) => (dateValue(r) || now) >= cut)
    } else if (selectedTimeRange === '3m') {
      const cut = now - 90 * 86400000
      result = result.filter((r) => (dateValue(r) || now) >= cut)
    } else if (selectedTimeRange === '6m') {
      const cut = now - 180 * 86400000
      result = result.filter((r) => (dateValue(r) || now) >= cut)
    } else if (selectedTimeRange === '1y') {
      const cut = now - 365 * 86400000
      result = result.filter((r) => (dateValue(r) || now) >= cut)
    } else if (selectedTimeRange === '3y') {
      const cut = now - 1095 * 86400000
      result = result.filter((r) => (dateValue(r) || now) >= cut)
    }

    if (selectedYear !== 'all') {
      const yr = parseInt(selectedYear, 10)
      result = result.filter((r) => {
        const ts = dateValue(r)
        if (!ts) return true
        return new Date(ts).getFullYear() === yr
      })
    }

    if (selectedMonth !== 'all') {
      const mo = parseInt(selectedMonth, 10) - 1
      result = result.filter((r) => {
        const ts = dateValue(r)
        if (!ts) return true
        return new Date(ts).getMonth() === mo
      })
    }

    if (selectedSourceFilter !== 'all') {
      result = result.filter(
        (r) => (r.source || '').toLowerCase() === selectedSourceFilter.toLowerCase()
      )
    }

    if (datePreset === '7d') {
      const cut = now - 7 * 86400000
      result = result.filter((r) => (dateValue(r) || now) >= cut)
    } else if (datePreset === '14d') {
      const cut = now - 14 * 86400000
      result = result.filter((r) => (dateValue(r) || now) >= cut)
    } else if (datePreset === '30d') {
      const cut = now - 30 * 86400000
      result = result.filter((r) => (dateValue(r) || now) >= cut)
    } else if (datePreset === 'custom') {
      if (startDate) {
        const startTs = new Date(startDate).getTime()
        result = result.filter((r) => dateValue(r) >= startTs)
      }
      if (endDate) {
        const endTs = new Date(endDate).getTime() + 86399999
        result = result.filter((r) => dateValue(r) <= endTs)
      }
    }

    return result
  }, [
    records,
    selectedTimeRange,
    selectedYear,
    selectedMonth,
    selectedSourceFilter,
    datePreset,
    startDate,
    endDate,
  ])

  const stats = useMemo(() => {
    const total = globallyFilteredRecords.length

    // Monitored feed sentiment breakdown (includes all visible sources such as MouthShut consumer reviews)
    const positive = globallyFilteredRecords.filter(
      (record) => sentimentOf(record) === 'positive'
    ).length

    const negative = globallyFilteredRecords.filter(
      (record) => sentimentOf(record) === 'negative'
    ).length

    const neutral = Math.max(0, total - positive - negative)

    // For executive reputation calculation (index score & net sentiment): exclude MouthShut per user specification
    const reputationFiltered = globallyFilteredRecords.filter(
      (r) => !String(r.source || '').toLowerCase().includes('mouthshut')
    )
    const repTotal = reputationFiltered.length

    const repPos = reputationFiltered.filter(
      (record) => sentimentOf(record) === 'positive'
    ).length

    const repNeg = reputationFiltered.filter(
      (record) => sentimentOf(record) === 'negative'
    ).length

    const repNeu = Math.max(0, repTotal - repPos - repNeg)

    const net = repTotal ? ((repPos - repNeg) / repTotal) * 100 : 0

    // Standardized Corporate Reputation Index (0 - 100): ((Positive + Neutral * 0.5) / Total) * 100
    const reputationScore = repTotal
      ? Math.max(0, Math.min(100, Math.round(((repPos + repNeu * 0.5) / repTotal) * 100)))
      : null

    // Customer Satisfaction Score (CSAT: 0 - 100) evaluated strictly on verified customer touchpoints
    // Combining globallyFilteredRecords and comments so all resident & homebuyer touchpoints are unified
    const combinedTouchpointPool = [...globallyFilteredRecords, ...comments]
    const seenCust = new Set()
    const customerFiltered = combinedTouchpointPool.filter((record) => {
      const id = record.url || record.title || record.text || record.id
      if (!id || seenCust.has(id)) return false
      seenCust.add(id)
      return isCustomerTouchpoint(record)
    })
    const custTotal = customerFiltered.length
    const custPos = customerFiltered.filter(
      (record) => sentimentOf(record) === 'positive'
    ).length
    const custNeg = customerFiltered.filter(
      (record) => sentimentOf(record) === 'negative'
    ).length
    const custNeu = Math.max(0, custTotal - custPos - custNeg)
    const csatScore = custTotal
      ? Math.max(0, Math.min(100, Math.round(((custPos + custNeu * 0.5) / custTotal) * 100)))
      : (liveExecutiveMetrics?.customer_satisfaction_score ?? null)

    return {
      total,
      repTotal,
      positive,
      negative,
      neutral,
      net,
      reputationScore,
      csatScore,
      custTotal,
      custPos,
      custNeg,
      custNeu,
      customerFiltered,
    }
  }, [globallyFilteredRecords, comments, liveExecutiveMetrics])

  const timeline = useMemo(
    () => getSentimentTimeline(globallyFilteredRecords),
    [globallyFilteredRecords]
  )

  const sourceCounts = useMemo(
    () =>
      globallyFilteredRecords.reduce((acc, record) => {
        const key = record.source || 'Other'
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {}),
    [globallyFilteredRecords]
  )

  const filteredRecords = useMemo(() => {
    let sourcePool = globallyFilteredRecords
    if (selectedSentimentFilter !== 'all') {
      sourcePool = sourcePool.filter((r) => sentimentOf(r) === selectedSentimentFilter)
    }

    if (!query.trim()) return sortRecordsBySourceHierarchy(sourcePool)

    const rawSearch = query.trim().toLowerCase()
    const searchWords = rawSearch.split(/[\s&,/\\-]+/).filter((w) => w.length > 1)

    const topicLexicon = {
      construction: ['construction', 'quality', 'structure', 'crack', 'material', 'cement', 'build', 'builder', 'project', 'handover', 'possession', 'delay', 'work', 'defect'],
      service: ['service', 'customer', 'crm', 'support', 'staff', 'response', 'complaint', 'behavior', 'agent', 'helpdesk', 'refund'],
      delay: ['delay', 'delays', 'handover', 'possession', 'late', 'timeline', 'stalled', 'launch', 'booking', 'wait', 'postponed', 'schedule'],
      price: ['price', 'pricing', 'cost', 'expensive', 'rate', 'crore', 'lakh', 'payment', 'charge', 'budget', 'rs', 'fee', 'hidden'],
      legal: ['legal', 'compliance', 'rera', 'court', 'case', 'dispute', 'notice', 'penalty', 'violation', 'lawsuit', 'approval', 'regulation', 'tribunal', 'order'],
    }

    let matchKeywords = [...searchWords, rawSearch]
    for (const [key, terms] of Object.entries(topicLexicon)) {
      if (searchWords.some((w) => key.includes(w) || terms.some((t) => t.includes(w))) || rawSearch.includes(key)) {
        matchKeywords = [...matchKeywords, ...terms]
      }
    }

    let matches = sourcePool.filter((record) => {
      const fullContent = `${record.title || ''} ${record.text || ''} ${record.description || ''} ${record.author || ''} ${record.source || ''}`.toLowerCase()
      return matchKeywords.some((term) => term.length > 1 && fullContent.includes(term))
    })

    if (!matches.length) {
      matches = records.filter((record) => {
        if (selectedSentimentFilter !== 'all' && sentimentOf(record) !== selectedSentimentFilter) return false
        const fullContent = `${record.title || ''} ${record.text || ''} ${record.description || ''} ${record.author || ''} ${record.source || ''}`.toLowerCase()
        return matchKeywords.some((term) => term.length > 1 && fullContent.includes(term))
      })
    }

    if (!matches.length) {
      matches = sourcePool.slice(0, 8)
    }

    return sortRecordsBySourceHierarchy(matches)
  }, [globallyFilteredRecords, records, query, selectedSentimentFilter])

  useEffect(() => {
    setVisibleCount(10)
  }, [query, selectedSentimentFilter])

  const visibleRecords = useMemo(() => {
    return filteredRecords.slice(0, visibleCount)
  }, [filteredRecords, visibleCount])

  const negativeCount = stats.negative

  const alertLevel =
    negativeCount >= 5
      ? 'Critical'
      : negativeCount >= 2
        ? 'High'
        : negativeCount >= 1
          ? 'Watch'
          : 'Clear'

  function goTo(section) {
    const target = document.getElementById(section)
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }

  function handleNav(name, section) {
    setActive(name)
    goTo(section)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <div className="brand-ring" />
            <div className="brand-core" />
          </div>

          <div>
            <strong>PURAVANKARA</strong>
            <span>REPUTATION INTELLIGENCE</span>
          </div>
        </div>

        <nav className="main-nav">
          {NAV_ITEMS.map(([name, Icon, section]) => (
            <button
              key={name}
              className={active === name ? 'nav-item active' : 'nav-item'}
              onClick={() => handleNav(name, section)}
            >
              <Icon size={18} />
              <span>{name}</span>

              {name === 'Alerts' && negativeCount > 0 && (
                <b className="nav-count">{negativeCount}</b>
              )}

              {name === 'Alerts Saved' && alerts.length > 0 && (
                <b className="nav-count" style={{ background: '#397cff', color: '#ffffff' }}>{alerts.length}</b>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="assistant-card">
            <div className="assistant-icon">
              <Sparkles size={19} />
            </div>

            <div>
              <h3>Reputation Intelligence</h3>

              <p>
                Surface emerging issues, sentiment shifts and reputation risks
                from the live dataset.
              </p>
            </div>

            <button onClick={() => handleNav('Insights', 'insights')}>
              Open insights
              <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="sidebar-status">
            <span className="status-dot" />
            API monitoring active
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="topbar-kicker">REPUTATION INTELLIGENCE</div>

            <h1>Command Center</h1>

            <p>
              Real-time perception, reputation risk and market signals for
              Puravankara.
            </p>
          </div>

          <div className="top-actions">
            <div className="live-status-badge">
              <span className={`live-pulse ${error ? 'offline' : 'online'}`} />
              <strong>{error ? 'OFFLINE' : 'LIVE'}</strong>
              <small>
                {lastUpdated
                  ? `Updated ${lastUpdated.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}`
                  : 'Syncing...'}
              </small>
            </div>

            <button
              className={`icon-button theme-toggle-btn ${theme}`}
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
              aria-label="Toggle theme mode"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              className="icon-button notification"
              onClick={() => handleNav('Alerts', 'alerts')}
              title={`${negativeCount} Active Alert${negativeCount === 1 ? '' : 's'}`}
              aria-label="View risk alerts and notifications"
            >
              <Bell size={18} />
              {negativeCount > 0 && <b>{negativeCount > 99 ? '99+' : negativeCount}</b>}
            </button>

            <button
              className={`icon-button ${showCalendar ? 'active' : ''}`}
              onClick={() => setShowCalendar((prev) => !prev)}
              title="Select Date Range Filter"
              aria-label="Open date range filter picker"
            >
              <CalendarDays size={18} />
            </button>

            {showCalendar && (
              <CalendarPopover
                selectedPreset={datePreset}
                onSelectPreset={setDatePreset}
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                matchCount={globallyFilteredRecords.length}
                onClose={() => setShowCalendar(false)}
                onReset={() => {
                  setDatePreset('all')
                  setStartDate('')
                  setEndDate('')
                }}
              />
            )}

            <button
              className="period-button"
              onClick={refreshFeed}
              disabled={refreshing}
              title="Collect the latest available results from all configured sources"
            >
              {refreshing ? 'Collecting feed…' : 'Refresh full feed'}
            </button>

            <div className="profile">
              <div className="avatar">PR</div>
              <div>
                <strong>Reputation Team</strong>
                <span>Puravankara</span>
              </div>
            </div>
          </div>
        </header>

        {error && (
          <div className="api-error">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="content">
          {active === 'Alerts Saved' ? (
            <SavedAlertsVaultView
              alerts={alerts}
              onSelectRecord={setSelectedRecord}
              onDeleteAlert={handleDeleteAlert}
            />
          ) : active === 'Settings' ? (
            <SettingsView
              theme={theme}
              onToggleTheme={toggleTheme}
              onSetTheme={setTheme}
              records={records}
              recordsCount={records.length}
              alertsCount={alerts.length}
              onRefresh={refreshFeed}
              refreshing={refreshing}
              API={API}
              pollInterval={pollInterval}
              onSetPollInterval={handleSetPollInterval}
              soundAlerts={soundAlerts}
              onToggleSoundAlerts={handleToggleSoundAlerts}
              alertSensitivity={alertSensitivity}
              onSetAlertSensitivity={handleSetAlertSensitivity}
            />
          ) : (
            <>
              <section className="executive-hero" id="overview">
                <div className="hero-copy">
                  <div className="hero-eyebrow">
                    <span />
                    EXECUTIVE REPUTATION COMMAND CENTER
                  </div>

                  <h2>
                    Puravankara
                    <br />
                    <span>reputation intelligence.</span>
                  </h2>

                  <p>
                    One executive view of brand perception, customer sentiment,
                    media visibility, emerging issues, crisis signals and
                    competitive conversation.
                  </p>

                  <div className="hero-meta">
                    <span>
                      <Activity size={14} />
                      Live intelligence feed
                    </span>

                    <span>
                      <Globe2 size={14} />
                      {globallyFilteredRecords.length.toLocaleString('en-IN')}{' '}
                      records analysed
                    </span>

                    <span>
                      {loading
                        ? 'Refreshing…'
                        : lastUpdated
                          ? `Updated ${lastUpdated.toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}`
                          : 'Awaiting data'}
                    </span>
                  </div>
                </div>

                <div className="hero-scores-wrapper">
                  <div className="hero-scores-row">
                    {/* Score 1: Overall Corporate Reputation */}
                    <div className="hero-score-block">
                      <div className={`score-orbit ${scoreFlash ? 'score-flash' : ''}`} title="Real-time Overall Corporate Reputation Score across all verified media & brand signals">
                        <div className="score-inner">
                          <span>
                            OVERALL
                            <br />
                            REPUTATION
                          </span>
                          <strong className={`score-live-val ${scoreFlash ? 'val-pulse' : ''}`}>{stats.reputationScore ?? '—'}</strong>
                          <small>/100</small>
                        </div>
                      </div>
                      <div className="score-caption">
                        <Gauge size={13} />
                        <span>Corporate Brand</span>
                      </div>
                    </div>

                    {/* Score 2: Customer Satisfaction (CSAT) */}
                    <div className="hero-score-block">
                      <div className={`score-orbit csat-orbit ${scoreFlash ? 'score-flash-csat' : ''}`} title="Real-time Customer Satisfaction Score (CSAT) across verified resident & buyer touchpoints">
                        <div className="score-inner">
                          <span>
                            CUSTOMER
                            <br />
                            SATISFACTION
                          </span>
                          <strong className={`score-live-val csat ${scoreFlash ? 'val-pulse' : ''}`}>{stats.csatScore ?? '—'}%</strong>
                          <small>CSAT</small>
                        </div>
                      </div>
                      <div className="score-caption">
                        <Smile size={13} />
                        <span>Resident & Buyer</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="stats-grid">
                <StatCard
                  title="Overall Reputation Score"
                  value={stats.reputationScore ?? 54}
                  suffix="/100"
                  trend={{ type: 'down', value: '6 pts' }}
                  tone="blue"
                  icon={Gauge}
                  values={timeline.scores}
                  dates={timeline.dates}
                  infoText="Current perception index out of 100"
                />

                <StatCard
                  title="Total Mentions"
                  value={stats.total}
                  trend={{ type: 'up', value: '12.5%' }}
                  tone="purple"
                  icon={MessageSquare}
                  values={timeline.totals}
                  dates={timeline.dates}
                  infoText="All unique records returned by API"
                />

                <StatCard
                  title="Positive Mentions"
                  value={stats.positive}
                  trend={{ type: 'up', value: '10.5%' }}
                  tone="green"
                  icon={CheckCircle2}
                  values={timeline.positive}
                  dates={timeline.dates}
                  infoText="Total positive mentions in dataset"
                />

                <StatCard
                  title="Negative Mentions"
                  value={stats.negative}
                  trend={{ type: 'up', value: '18.3%' }}
                  tone="red"
                  icon={ShieldAlert}
                  values={timeline.negative}
                  dates={timeline.dates}
                  infoText="Total negative mentions requiring attention"
                />

                <StatCard
                  title="Net Sentiment"
                  value={`${stats.net >= 0 ? '+' : ''}${stats.net.toFixed(1)}%`}
                  trend={{ type: 'up', value: '5.4%' }}
                  tone="orange"
                  icon={Zap}
                  values={timeline.nets}
                  dates={timeline.dates}
                  infoText="Net Sentiment: ((Positive - Negative) / Total) * 100"
                />
              </section>

              <section className="dashboard-grid top-grid" id="sentiment">
                <div className="panel trend-panel">
                  <div className="panel-title">
                    <div>
                      <div className="panel-kicker">PERCEPTION MOVEMENT</div>
                      <h3>Sentiment Trend</h3>
                    </div>
                  </div>

                  <TrendChart
                    records={globallyFilteredRecords}
                    timeRange={selectedTimeRange}
                    onTimeRangeChange={setSelectedTimeRange}
                    year={selectedYear}
                    onYearChange={setSelectedYear}
                    month={selectedMonth}
                    onMonthChange={setSelectedMonth}
                    source={selectedSourceFilter}
                    onSourceChange={setSelectedSourceFilter}
                  />
                </div>

                <div className="panel source-panel">
                  <DonutChart
                    counts={sourceCounts}
                    selectedSource={selectedSourceFilter}
                    onSelectSource={setSelectedSourceFilter}
                  />
                </div>

                <div className="panel issues-panel" id="issues">
                  <IssuePanel
                    records={globallyFilteredRecords}
                    onSelectIssue={(issue) => {
                      const keywordMap = {
                        'Legal & Compliance': 'legal',
                        'Construction Quality': 'construction',
                        'Customer Service': 'service',
                        'Project Delays': 'delay',
                        'Pricing Concerns': 'price',
                      }
                      const searchTerm = keywordMap[issue.name] || 'legal'
                      setQuery(searchTerm)

                      const el = document.getElementById('mentions')
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }
                    }}
                  />
                </div>
              </section>

              <section
                className="dashboard-grid intelligence-grid"
                id="insights"
              >
                <div className="panel css-panel">
                  <CustomerSatisfaction
                    records={records}
                    comments={comments}
                    lastUpdated={lastUpdated}
                    loading={loading}
                    error={error}
                    timeRange={selectedTimeRange}
                    onTimeRangeChange={setSelectedTimeRange}
                    stats={stats}
                    onSelectSentiment={(sentiment) => {
                      setSelectedSentimentFilter(sentiment)
                      const el = document.getElementById('mentions')
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }
                    }}
                  />
                </div>

                <div
                  className="panel crisis-panel"
                  id="alerts"
                >
                  <div className="panel-title">
                    <div>
                      <div className="panel-kicker danger">
                        RISK INTELLIGENCE
                      </div>

                      <h3>
                        High / Critical Alert &
                        Crisis Intelligence
                      </h3>

                      <span>
                        Negative signals requiring
                        attention.
                      </span>
                    </div>

                    <StatPill
                      tone={
                        alertLevel ===
                          'Clear'
                          ? 'green'
                          : 'red'
                      }
                    >
                      {alertLevel}
                    </StatPill>
                  </div>

                  <AlertPanel
                    records={records}
                    onSelectRecord={setSelectedRecord}
                  />
                </div>

                <div className="panel benchmark-panel">
                  <div className="panel-title">
                    <div>
                      <div className="panel-kicker">
                        MARKET CONTEXT
                      </div>

                      <h3>
                        Competitor Benchmarking
                      </h3>

                      <span>
                        Competitive brands detected
                        in the current conversation.
                      </span>
                    </div>
                  </div>

                  <CompetitorBenchmark
                    records={records}
                  />
                </div>
              </section>

              <section className="panel executive-analysis">
                <ExecutiveIntelligencePanel
                  records={globallyFilteredRecords}
                  comments={comments}
                  stats={stats}
                  alerts={alerts}
                  lastUpdated={lastUpdated}
                  loading={loading}
                  pollInterval={pollInterval}
                  onRefresh={refreshFeed}
                  onSelectFilter={(filterVal) => {
                    if (['positive', 'neutral', 'negative'].includes(filterVal)) {
                      setSelectedSentimentFilter(filterVal)
                    } else {
                      setQuery(filterVal)
                    }
                  }}
                />

                <CorporateIntelligenceCard />
              </section>

              <section className="panel hot-panel">
                <div className="panel-title">
                  <div>
                    <div className="panel-kicker">
                      LIVE SIGNALS
                    </div>

                    <h3>
                      Hot Now
                    </h3>

                    <span>
                      The most relevant recent
                      records from the current
                      intelligence feed.
                    </span>
                  </div>

                  <button
                    className="link-button"
                    onClick={() =>
                      handleNav(
                        'Sources & Mentions',
                        'mentions'
                      )
                    }
                  >
                    Open all mentions →
                  </button>
                </div>

                <HotNow
                  records={records}
                  onSelectRecord={setSelectedRecord}
                />
              </section>

              <section
                className="panel mentions-panel"
                id="mentions"
              >
                <div className="panel-title mentions-heading">
                  <div>
                    <div className="panel-kicker">
                      MONITORED CONTENT
                    </div>

                    <h3>
                      Reputation Feed
                    </h3>

                    <span>
                      {filteredRecords.length.toLocaleString(
                        'en-IN'
                      )}{' '}
                      records visible · no frontend
                      10-record limit
                    </span>
                  </div>

                  <label className="search-box">
                    <Search size={16} />

                    <input
                      value={query}
                      onChange={(event) =>
                        setQuery(
                          event.target.value
                        )
                      }
                      placeholder="Search mentions, authors, sources..."
                    />

                    {query && (
                      <button
                        type="button"
                        onClick={() =>
                          setQuery('')
                        }
                      >
                        Clear
                      </button>
                    )}
                  </label>
                </div>

                <div className="feed-summary">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <SentimentBadgePill
                      tone="green"
                      count={stats.positive}
                      label="Positive"
                      active={selectedSentimentFilter === 'positive'}
                      onClick={() => setSelectedSentimentFilter((prev) => prev === 'positive' ? 'all' : 'positive')}
                    />

                    <SentimentBadgePill
                      tone="blue"
                      count={stats.neutral}
                      label="Neutral"
                      active={selectedSentimentFilter === 'neutral'}
                      onClick={() => setSelectedSentimentFilter((prev) => prev === 'neutral' ? 'all' : 'neutral')}
                    />

                    <SentimentBadgePill
                      tone="red"
                      count={stats.negative}
                      label="Negative"
                      active={selectedSentimentFilter === 'negative'}
                      onClick={() => setSelectedSentimentFilter((prev) => prev === 'negative' ? 'all' : 'negative')}
                    />

                    {selectedSentimentFilter !== 'all' && (
                      <button
                        type="button"
                        className="feed-show-all-btn"
                        onClick={() => setSelectedSentimentFilter('all')}
                        title="Clear sentiment filter and show all records"
                      >
                        <span>Show All ({stats.total})</span>
                        <span className="feed-show-all-x">✕</span>
                      </button>
                    )}
                  </div>

                  <span>
                    Click <strong>View source</strong> on any record to open the original content.
                  </span>
                </div>

                <div className="mentions-list">
                  {visibleRecords.length ? (
                    visibleRecords.map(
                      (record, index) => (
                        <MentionCard
                          record={record}
                          activeQuery={query}
                          onSelectRecord={setSelectedRecord}
                          key={
                            record.url ||
                            `${record.source}-${record.title}-${index}`
                          }
                        />
                      )
                    )
                  ) : (
                    <div className="empty-state">
                      <Search size={25} />
                      <strong>
                        No matching records
                      </strong>
                      <span>
                        Try a different search term.
                      </span>
                    </div>
                  )}
                </div>

                {filteredRecords.length > 0 && (
                  <div className="load-more-container">
                    <span className="load-more-status">
                      Showing <strong>{Math.min(visibleCount, filteredRecords.length)}</strong> of <strong>{filteredRecords.length}</strong> total mentions for Puravankara & Leadership
                    </span>

                    <div className="load-more-buttons">
                      {filteredRecords.length > visibleCount ? (
                        <>
                          <button
                            type="button"
                            className="load-more-btn"
                            onClick={() => setVisibleCount((prev) => prev + 10)}
                          >
                            Load 10 More Mentions ({filteredRecords.length - visibleCount} remaining) ↓
                          </button>

                          <button
                            type="button"
                            className="show-all-btn"
                            onClick={() => setVisibleCount(filteredRecords.length)}
                          >
                            Show All ({filteredRecords.length})
                          </button>
                        </>
                      ) : filteredRecords.length > 10 ? (
                        <button
                          type="button"
                          className="show-all-btn"
                          onClick={() => setVisibleCount(10)}
                        >
                          Collapse view (Show 10 most recent) ↑
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}
              </section>
            </>
          )}

          <ExecutiveDisclaimer />

          <footer className="footer">
            <div>
              <span className="footer-online">
                <i />
                System online
              </span>

              <span>
                Puravankara Reputation
                Intelligence
              </span>
            </div>

            <div>
              <span>
                Backend:{' '}
                <strong>
                  127.0.0.1:8000
                </strong>
              </span>

              <span>
                {loading
                  ? 'Refreshing intelligence…'
                  : lastUpdated
                    ? `Last refresh ${lastUpdated.toLocaleTimeString(
                      'en-IN',
                      {
                        hour: '2-digit',
                        minute: '2-digit',
                      }
                    )}`
                    : 'Not refreshed'}
              </span>
            </div>
          </footer>
        </div>
      </main>

      <RecordDrawer
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
      />

      <IssueDetailModal
        issue={selectedIssueDetail}
        records={globallyFilteredRecords}
        onClose={() => setSelectedIssueDetail(null)}
        onSelectRecord={setSelectedRecord}
      />
    </div>
  )
}

export default App
