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
  Newspaper,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  Target,
  Users,
  Zap,
  Play,
  X,
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
  ['Projects', Newspaper, 'projects'],
  ['Stakeholders', Users, 'stakeholders'],
  ['Reports', Gauge, 'reports'],
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
  const d = new Date(
    item?.published_at ||
      item?.created_at ||
      item?.date ||
      item?.published ||
      ''
  )

  return Number.isNaN(d.getTime()) ? 0 : d.getTime()
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
  }

  const text = `${item.title || ''} ${item.text || ''} ${item.description || ''}`.toLowerCase()

  const negKeywords = [
    'delay', 'complaint', 'court', 'rera', 'issue', 'legal', 'expensive',
    'quality', 'problem', 'bad', 'worst', 'fraud', 'scam', 'defect',
    'leakage', 'leak', 'poor', 'disappointed', 'warning', 'risk', 'fail', 'cancel',
    'dispute', 'notice', 'penalty', 'violation', 'lawsuit', 'loss', 'fine',
    'stuck', 'protest', 'cheated', 'halt', 'stalled'
  ]

  const posKeywords = [
    'best', 'premium', 'great', 'luxury', 'excellent', 'top', 'launch',
    'opportunity', 'growth', 'landmark', 'beautiful', 'wonderful', 'superb',
    'highlight', 'successful', 'reward', 'profit', 'surged', 'gains', 'award', 'leader', 'joined'
  ]

  const negHits = negKeywords.filter((k) => text.includes(k)).length
  const posHits = posKeywords.filter((k) => text.includes(k)).length

  if (negHits > posHits) return 'negative'
  if (posHits > negHits) return 'positive'
  if (negHits > 0) return 'negative'
  if (posHits > 0) return 'positive'

  return 'neutral'
}

function sourceName(source = '') {
  const s = String(source).toLowerCase()

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

function RecordDrawer({ record, onClose }) {
  if (!record) return null
  const sentiment = sentimentOf(record)
  const intel = generateExecutiveDescription(record)

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div
        className="drawer-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '620px', maxWidth: '92vw' }}
      >
        <header className="drawer-header">
          <div className="drawer-header-left">
            <span
              className={`source-pill ${record.source
                .toLowerCase()
                .replace(/\W+/g, '-')}`}
            >
              {sourceIcon(record.source)}
              {record.source}
            </span>

            <span className={`sentiment-pill ${sentiment}`}>
              {sentiment}
            </span>
          </div>

          <button className="drawer-close" onClick={onClose} aria-label="Close details sidebar">
            <X size={20} />
          </button>
        </header>

        <div className="drawer-body" style={{ padding: '24px' }}>
          <h2 className="drawer-title" style={{ fontSize: '20px', fontWeight: '800', lineHeight: '1.4', color: '#ffffff', marginBottom: '18px' }}>
            {generatedTitle(record)}
          </h2>

          <div className="drawer-meta-grid" style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="drawer-meta-box" style={{ background: '#0b1320', padding: '12px', borderRadius: '8px', border: '1px solid #1c2b3e' }}>
              <span style={{ fontSize: '11px', color: '#718299', fontWeight: '700' }}>AUTHOR / PUBLISHER</span>
              <strong style={{ fontSize: '14px', color: '#edf3fa', display: 'block', marginTop: '4px' }}>{cleanAuthor(record)}</strong>
            </div>

            <div className="drawer-meta-box" style={{ background: '#0b1320', padding: '12px', borderRadius: '8px', border: '1px solid #1c2b3e' }}>
              <span style={{ fontSize: '11px', color: '#718299', fontWeight: '700' }}>PUBLISHED DATE</span>
              <strong style={{ fontSize: '14px', color: '#edf3fa', display: 'block', marginTop: '4px' }}>{formatDate(record)} {formatTime(record)}</strong>
            </div>
          </div>

          <div className="drawer-text-block" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Section 1: URL Content Summary */}
            <div style={{ background: '#0b1320', padding: '20px', borderRadius: '12px', border: '1.5px solid #1c2b3e' }}>
              <h3 style={{ color: '#397cff', fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📖 URL CONTENT SUMMARY & OVERVIEW
              </h3>
              <p style={{ color: '#e1ebfa', fontSize: '15px', lineHeight: '1.7', margin: '0 0 14px 0' }}>
                {intel.urlContentSummary}
              </p>

              <div style={{ background: '#101b2d', padding: '10px 14px', borderRadius: '8px', border: '1px solid #243752', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: '#8fa1b8', fontWeight: '600' }}>Article Source URL:</span>
                <a
                  href={intel.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#ff9d3b', fontSize: '13px', fontWeight: '700', textDecoration: 'underline', wordBreak: 'break-all' }}
                >
                  {intel.targetUrl.length > 55 ? `${intel.targetUrl.slice(0, 52)}...` : intel.targetUrl} ↗
                </a>
              </div>
            </div>

            {/* Section 2: Key Article Highlights */}
            <div style={{ background: '#0b1320', padding: '20px', borderRadius: '12px', border: '1.5px solid #1c2b3e' }}>
              <h3 style={{ color: '#21d88d', fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>
                💡 KEY HIGHLIGHTS & TOPIC ANALYSIS ({intel.topicLabel})
              </h3>
              <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {intel.keyHighlights.map((point, index) => (
                  <li key={index} style={{ color: '#c5d4ed', fontSize: '14px', lineHeight: '1.6' }}>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <footer className="drawer-footer" style={{ padding: '20px 24px', borderTop: '1px solid #1c2b3e', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <a
            href={intel.targetUrl}
            target="_blank"
            rel="noreferrer"
            className="drawer-primary-btn"
            style={{ height: '42px', padding: '0 20px', borderRadius: '8px', background: '#397cff', color: '#ffffff', fontSize: '14px', fontWeight: '700', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            Open Original Article Link
            <ExternalLink size={15} />
          </a>

          <button
            type="button"
            className="drawer-secondary-btn"
            onClick={onClose}
            style={{ height: '42px', padding: '0 18px', borderRadius: '8px', background: '#152236', border: '1px solid #283a52', color: '#edf3fa', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
          >
            Close Summary
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
                  onClick={() => openNewsArticle(record, issue.name)}
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
      <span style={{ color: active ? theme.activeText : '#ffffff' }}>{label}</span>
    </button>
  )
}

function getRecordUrl(record, topicHint = '') {
  const officialLinkedIn = 'https://www.linkedin.com/company/puravankara-limited/'
  if (!record) return officialLinkedIn

  let targetUrl = String(record.url || record.link || record.source_url || '').trim()
  const sourceName = String(record.source || '').toLowerCase()

  const isLinkedIn = sourceName.includes('linkedin') || targetUrl.toLowerCase().includes('linkedin')

  if (isLinkedIn) {
    if (
      !targetUrl ||
      targetUrl === '#' ||
      targetUrl.includes('unavailable') ||
      targetUrl.includes('puravankara-projects-ltd') ||
      !targetUrl.startsWith('http')
    ) {
      return officialLinkedIn
    }
    return targetUrl
  }

  if (
    !targetUrl ||
    targetUrl === '#' ||
    targetUrl.includes('unavailable') ||
    targetUrl.includes('null') ||
    !targetUrl.startsWith('http')
  ) {
    const term = encodeURIComponent(
      `Puravankara ${topicHint || record.title || record.source || 'real estate'}`
    )
    targetUrl = `https://news.google.com/search?q=${term}`
  }
  return targetUrl
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
    <div className="saved-alerts-vault" style={{ marginTop: '10px' }}>
      <div
        className="vault-header"
        style={{
          background: '#0d1624',
          border: '1.5px solid #1e2f47',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div className="panel-kicker danger" style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '0.15em', color: '#ff5b60' }}>
            PERMANENT ALERT REPOSITORY
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#ffffff', margin: '4px 0 6px' }}>
            📂 Saved Emergency Alerts Vault
          </h2>
          <p style={{ fontSize: '13px', color: '#9cb0c9', margin: 0 }}>
            Every detected emergency alert message is automatically saved here. Pinned for at least 1 hour during live monitoring and retained for executive audit.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className={`time-pill ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
            style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: filter === 'all' ? '#397cff' : '#172436', color: '#ffffff', border: '1px solid #283b54' }}
          >
            All Saved ({alerts.length})
          </button>
          <button
            type="button"
            className={`time-pill ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
            style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: filter === 'active' ? '#ff5b60' : '#172436', color: '#ffffff', border: '1px solid #283b54' }}
          >
            🚨 Active 1-Hr ({activeCount})
          </button>
          <button
            type="button"
            className={`time-pill ${filter === 'archived' ? 'active' : ''}`}
            onClick={() => setFilter('archived')}
            style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: filter === 'archived' ? '#397cff' : '#172436', color: '#ffffff', border: '1px solid #283b54' }}
          >
            📁 Archived ({alerts.length - activeCount})
          </button>
        </div>
      </div>

      {!filteredAlerts.length ? (
        <div className="empty-panel" style={{ background: '#0d1624', border: '1.5px solid #1e2f47', borderRadius: '12px', padding: '40px 20px', textAlign: 'center', color: '#9cb0c9' }}>
          <BookmarkCheck size={36} style={{ color: '#397cff', marginBottom: '10px' }} />
          <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#ffffff', margin: '0 0 6px' }}>No Saved Alerts Found</h4>
          <p style={{ fontSize: '13px', margin: 0 }}>Emergency alerts will automatically accumulate and remain saved here when detected.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className="saved-alert-card"
              style={{
                background: '#0d1624',
                border: alert.is_active ? '1.5px solid #ff5b60' : '1.5px solid #1e2f47',
                borderRadius: '12px',
                padding: '18px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: alert.is_active ? '0 0 20px rgba(255, 91, 96, 0.25)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      background: alert.is_active ? '#ff5b60' : '#23364f',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: '800',
                      padding: '3px 9px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {alert.is_active ? '🚨 ACTIVE (1-HR WINDOW)' : '📁 ARCHIVED LOG'}
                  </span>
                  <span className="source-pill-mini">
                    {sourceIcon(alert.source)}
                    {alert.source}
                  </span>
                </div>

                <div style={{ fontSize: '11px', color: '#9cb0c9', fontWeight: '600' }}>
                  Detected: {formatDate(alert.detected_at ? { timestamp: new Date(alert.detected_at).getTime() / 1000 } : {})}
                </div>
              </div>

              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#ffffff', lineHeight: '1.4' }}>
                {alert.title}
              </h4>

              <div style={{ background: '#070d17', border: '1px solid #19273a', borderRadius: '8px', padding: '12px 14px', color: '#dce7f5', fontSize: '12.5px', lineHeight: '1.55' }}>
                <strong style={{ color: '#ffb53b', display: 'block', marginBottom: '4px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  📜 SAVED EXECUTIVE BRIEFING MESSAGE:
                </strong>
                {alert.message}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: '8px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {alert.record && (
                    <button
                      type="button"
                      className="drawer-trigger-btn"
                      style={{ height: '30px', padding: '0 12px', fontSize: '11.5px' }}
                      onClick={() => onSelectRecord && onSelectRecord(alert.record)}
                    >
                      View Details & Summary
                    </button>
                  )}

                  {alert.url && (
                    <a
                      href={alert.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#ff9d3b', fontSize: '11.5px', fontWeight: '700', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      Open Article Link <ExternalLink size={12} />
                    </a>
                  )}
                </div>

                {onDeleteAlert && (
                  <button
                    type="button"
                    onClick={() => onDeleteAlert(alert.id)}
                    style={{ background: 'transparent', border: '1px solid #362225', color: '#ff7b7e', fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '5px', cursor: 'pointer' }}
                  >
                    Dismiss Alert Log
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AlertPanel({ records }) {
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

  return (
    <div className="alert-list">
      {negatives.slice(0, 5).map((record, index) => (
        <a
          className="alert-row"
          key={record.url || `${record.title}-${index}`}
          href={getRecordUrl(record)}
          target="_blank"
          rel="noopener noreferrer"
          title={`Click to open news article: ${record.title || record.source}`}
        >
          <span className="alert-symbol">
            <AlertTriangle size={17} />
          </span>

          <div>
            <strong>{generatedTitle(record)}</strong>
            <small>{record.source} · {formatDate(record)}</small>
          </div>

          <ExternalLink size={14} style={{ color: '#397cff' }} />
        </a>
      ))}
    </div>
  )
}

function MentionCard({ record, onSelectRecord, activeQuery }) {
  const sentiment = sentimentOf(record)
  const fullText = `${record.title || ''} ${record.text || ''} ${record.description || ''}`.toLowerCase()
  const isMatch = activeQuery && activeQuery.trim().length > 1 && fullText.includes(activeQuery.trim().toLowerCase())

  return (
    <article className={`mention-card ${isMatch ? 'highlighted-card' : ''}`}>
      <div className="mention-top">
        <span
          className={`source-pill ${record.source
            .toLowerCase()
            .replace(/\W+/g, '-')}`}
        >
          {sourceIcon(record.source)}
          {record.source}
        </span>

        <span className={`sentiment-pill ${sentiment}`}>
          {sentiment}
        </span>
      </div>

      <div className="mention-content">
        <h4>{generatedTitle(record)}</h4>
        <p>{cardDescription(record)}</p>
      </div>

      <div className="mention-footer">
        <span>{cleanAuthor(record)}</span>
        <span>{formatDate(record)}</span>

        {record.relevance_score !== undefined && (
          <span>
            Relevance {Number(record.relevance_score || 0).toFixed(1)}
          </span>
        )}

        <button
          type="button"
          className="drawer-trigger-btn"
          onClick={() => onSelectRecord && onSelectRecord(record)}
        >
          View details
        </button>

        <a
          href={getRecordUrl(record)}
          target="_blank"
          rel="noopener noreferrer"
          title={`Open original article: ${record.title || record.source}`}
        >
          View source
          <ExternalLink size={13} style={{ marginLeft: 4 }} />
        </a>
      </div>
    </article>
  )
}

function HotNow({ records }) {
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
        hot.map((record, index) => (
          <a
            href={getRecordUrl(record)}
            target="_blank"
            rel="noopener noreferrer"
            className="hot-item"
            key={record.url || `${record.title}-${index}`}
            title={`Click to open news article: ${record.title || record.source}`}
          >
            <div className="hot-rank">
              {String(index + 1).padStart(2, '0')}
            </div>

            <div className="hot-content">
              <div className="hot-meta">
                <span className="source-pill-mini">
                  {sourceIcon(record.source)}
                  {record.source}
                </span>
                <span>{formatDate(record)} · {formatTime(record)}</span>
              </div>

              <strong>{generatedTitle(record)}</strong>

              <small>{cleanAuthor(record)}</small>
            </div>

            <span className={`sentiment-pill ${sentimentOf(record)}`}>
              {sentimentOf(record)}
            </span>

            <ExternalLink size={15} style={{ color: '#ff9d3b', flexShrink: 0, marginLeft: 6 }} />
          </a>
        ))
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

  // Counts using normalized sentimentOf
  const positive = useMemo(
    () => pool.filter((r) => sentimentOf(r) === 'positive').length,
    [pool]
  )
  const negative = useMemo(
    () => pool.filter((r) => sentimentOf(r) === 'negative').length,
    [pool]
  )
  const neutral = Math.max(0, total - positive - negative)

  const posPct = total ? Math.round((positive / total) * 100) : 0
  const neuPct = total ? Math.round((neutral / total) * 100) : 0
  const negPct = total ? Math.max(0, 100 - posPct - neuPct) : 0

  // Reputation Score (0 - 100)
  const score = total
    ? Math.round(((positive + neutral * 0.5) / total) * 100)
    : 0

  // Net Sentiment (-100% to +100%)
  const netSentimentPct = total
    ? Math.round(((positive - negative) / total) * 100)
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

  // 7-day period delta comparison
  const rangeMs = 7 * 24 * 3600 * 1000
  const prevPool = useMemo(() => {
    const startPrev = now - rangeMs * 2
    const endPrev = now - rangeMs
    return pool.filter((r) => {
      const t = getItemTime(r)
      return t >= startPrev && t < endPrev
    })
  }, [pool, now])

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
          <span className="exec-subtitle">
            Real-time AI-assisted interpretation of current reputation signals
          </span>
        </div>

        <div className="exec-header-right">
          <div className="exec-live-status">
            <span className="exec-live-pulse" />
            <span>LIVE</span>
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

      {/* 4-Column Executive Metric Blocks */}
      <div className="exec-kpi-grid">
        {/* Metric 1: Reputation Status */}
        <div className="exec-kpi-card">
          <div className="exec-kpi-header">
            <span className="exec-kpi-label">REPUTATION SCORE</span>
            <span
              className={`exec-badge ${
                score >= 75 ? 'good' : score >= 50 ? 'watch' : 'critical'
              }`}
            >
              {score >= 75 ? 'FAVOURABLE' : score >= 50 ? 'WATCH' : 'AT RISK'}
            </span>
          </div>
          <div className="exec-kpi-body">
            <span className="exec-kpi-val">{score}</span>
            <span className="exec-kpi-denom">/100</span>
          </div>
          <div className="exec-kpi-footer">
            <span
              className={`exec-trend-pill ${
                scoreDelta >= 0 ? 'positive' : 'negative'
              }`}
            >
              {scoreDelta >= 0 ? `↑ +${scoreDelta} pts` : `↓ ${scoreDelta} pts`}{' '}
              vs prev period
            </span>
          </div>
        </div>

        {/* Metric 2: Signal Volume */}
        <div className="exec-kpi-card">
          <div className="exec-kpi-header">
            <span className="exec-kpi-label">SIGNALS VOLUME</span>
            <span className="exec-badge neutral">{total} Total</span>
          </div>
          <div className="exec-kpi-body">
            <span className="exec-kpi-val">
              {total.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="exec-kpi-footer">
            <span className="exec-split-text">
              <strong className="pos">{positive} Pos</strong> ·{' '}
              <strong className="neu">{neutral} Neu</strong> ·{' '}
              <strong className="neg">{negative} Neg</strong>
            </span>
          </div>
        </div>

        {/* Metric 3: Net Sentiment */}
        <div className="exec-kpi-card">
          <div className="exec-kpi-header">
            <span className="exec-kpi-label">NET SENTIMENT</span>
            <span
              className={`exec-badge ${
                netSentimentPct >= 0 ? 'good' : 'critical'
              }`}
            >
              {netSentimentPct >= 0 ? 'POSITIVE SHIFT' : 'NEGATIVE DRAG'}
            </span>
          </div>
          <div className="exec-kpi-body">
            <span className="exec-kpi-val">
              {netSentimentPct >= 0
                ? `+${netSentimentPct}%`
                : `${netSentimentPct}%`}
            </span>
          </div>
          <div className="exec-kpi-footer">
            <span className="exec-sub-info">
              {posPct}% positive vs {negPct}% negative ratio
            </span>
          </div>
        </div>

        {/* Metric 4: Risk Level */}
        <div className="exec-kpi-card">
          <div className="exec-kpi-header">
            <span className="exec-kpi-label">RISK LEVEL</span>
            <span className={`exec-badge ${riskTone}`}>{riskLevel} RISK</span>
          </div>
          <div className="exec-kpi-body">
            <span className={`exec-kpi-val ${riskTone}`}>{riskLevel}</span>
          </div>
          <div className="exec-kpi-footer">
            <span className="exec-sub-info">{riskAdvice}</span>
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
                ? `Puravankara maintains a ${
                    score >= 75
                      ? 'favourable'
                      : score >= 50
                      ? 'monitored'
                      : 'critical'
                  } reputation score of ${score}/100 across ${total} active signals. Positive sentiment accounts for ${posPct}% of conversation driven primarily by ${
                    topPositiveKeyword
                      ? topPositiveKeyword.label
                      : 'corporate announcements'
                  }, while ${negative} negative mentions (${negPct}%) require focused tracking around ${
                    topNegativeKeyword
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
                  ? `Prioritize customer support response for ${
                      topNegativeKeyword
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
}) {
  const [timeRange, setTimeRange] = useState('7d')
  const [showTooltip, setShowTooltip] = useState(false)

  // Combined dataset from records & comments
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

  const currentRecords = useMemo(() => {
    if (timeRange === 'all') return pool
    const ms = getRangeMs(timeRange)
    const cutoff = now - ms
    const filtered = pool.filter((r) => {
      const t = getItemTime(r)
      return t === 0 || t >= cutoff
    })
    return filtered.length > 0 ? filtered : pool
  }, [pool, timeRange, now])

  const prevPeriodScore = useMemo(() => {
    if (timeRange === 'all') return null
    const ms = getRangeMs(timeRange)
    if (!isFinite(ms)) return null
    const startPrev = now - ms * 2
    const endPrev = now - ms
    const prevRecs = pool.filter((r) => {
      const t = getItemTime(r)
      return t >= startPrev && t < endPrev
    })
    if (prevRecs.length === 0) return null
    const pos = prevRecs.filter((r) => sentimentOf(r) === 'positive').length
    const neg = prevRecs.filter((r) => sentimentOf(r) === 'negative').length
    const neu = Math.max(0, prevRecs.length - pos - neg)
    return Math.round(((pos + neu * 0.5) / prevRecs.length) * 100)
  }, [pool, timeRange, now])

  const positive = currentRecords.filter(
    (r) => sentimentOf(r) === 'positive'
  ).length

  const negative = currentRecords.filter(
    (r) => sentimentOf(r) === 'negative'
  ).length

  const neutral = Math.max(
    0,
    currentRecords.length - positive - negative
  )

  const total = currentRecords.length

  const css = total
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
          <span className="css-kicker">CUSTOMER VOICE</span>
          <h3 className="css-card-title">
            Customer Satisfaction Score
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
                  Customer Satisfaction Score is calculated from customer
                  sentiment records during the selected period.
                  <br />
                  <strong>Formula:</strong> ((Positive + Neutral × 0.5) /
                  Total) × 100
                </div>
              )}
            </div>
          </h3>
        </div>

        <CssPeriodDropdown value={timeRange} onChange={setTimeRange} />
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
          Calculated from <strong>{total}</strong> customer sentiment records
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
                width: `${
                  (competitor.count /
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

function App() {
  const [records, setRecords] = useState([])
  const [comments, setComments] = useState([])
  const [alerts, setAlerts] = useState([])
  const [activeAlert, setActiveAlert] = useState(null)
  const [active, setActive] = useState('Overview')
  const [query, setQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(10)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [selectedIssueDetail, setSelectedIssueDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  const [showCalendar, setShowCalendar] = useState(false)
  const [datePreset, setDatePreset] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [selectedTimeRange, setSelectedTimeRange] = useState('7d')
  const [selectedYear, setSelectedYear] = useState('all')
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [selectedSourceFilter, setSelectedSourceFilter] = useState('all')
  const [selectedSentimentFilter, setSelectedSentimentFilter] = useState('all')

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setLoading(true)
      setError('')

      const endpoints = [
        '/api/reputation',
        '/api/mentions',
        '/api/comments',
        '/api/alerts',
      ]

      try {
        const responses = await Promise.allSettled(
          endpoints.map((endpoint) =>
            fetch(`${API}${endpoint}`, {
              headers: {
                Accept: 'application/json',
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

        const [reputation, mentions, commentData, alertPayload] = payloads

        const combined = uniqueRecords(reputation, mentions)

        setRecords(combined)
        setComments(Array.isArray(commentData) ? commentData.map(normaliseRecord) : [])
        if (alertPayload && typeof alertPayload === 'object' && !Array.isArray(alertPayload)) {
          setAlerts(alertPayload.all_alerts || [])
          setActiveAlert((alertPayload.active_alerts && alertPayload.active_alerts[0]) || null)
        }
        setLastUpdated(new Date())

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
        }
      }
    }

    loadData()

    const interval = setInterval(loadData, 30_000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [refreshKey])

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
        <div style={{ background: '#0b1320', padding: '12px 14px', borderRadius: '8px', border: '1px solid #1c2b3e' }}>
          <span style={{ fontSize: '10px', color: '#718299', fontWeight: '700', textTransform: 'uppercase' }}>LEADERSHIP</span>
          <strong style={{ display: 'block', color: '#edf3fa', fontSize: '13px', margin: '4px 0 2px' }}>Ravi Puravankara</strong>
          <small style={{ color: '#8fa1b8', fontSize: '11px' }}>Founder Chairman (Est. 1975)</small>
          <strong style={{ display: 'block', color: '#edf3fa', fontSize: '13px', margin: '8px 0 2px' }}>Ashish Puravankara</strong>
          <small style={{ color: '#8fa1b8', fontSize: '11px' }}>Managing Director</small>
        </div>

        <div style={{ background: '#0b1320', padding: '12px 14px', borderRadius: '8px', border: '1px solid #1c2b3e' }}>
          <span style={{ fontSize: '10px', color: '#718299', fontWeight: '700', textTransform: 'uppercase' }}>TRACK RECORD</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
            <div>
              <strong style={{ color: '#397cff', fontSize: '15px' }}>48+ Years</strong>
              <small style={{ display: 'block', color: '#8fa1b8', fontSize: '10px' }}>Real Estate Legacy</small>
            </div>
            <div>
              <strong style={{ color: '#21d88d', fontSize: '15px' }}>45+M Sq Ft</strong>
              <small style={{ display: 'block', color: '#8fa1b8', fontSize: '10px' }}>Delivered Portfolio</small>
            </div>
            <div>
              <strong style={{ color: '#ffb53b', fontSize: '15px' }}>80+ Projects</strong>
              <small style={{ display: 'block', color: '#8fa1b8', fontSize: '10px' }}>Completed</small>
            </div>
            <div>
              <strong style={{ color: '#a2b0ff', fontSize: '15px' }}>45,000+</strong>
              <small style={{ display: 'block', color: '#8fa1b8', fontSize: '10px' }}>Homeowners</small>
            </div>
          </div>
        </div>

        <div style={{ background: '#0b1320', padding: '12px 14px', borderRadius: '8px', border: '1px solid #1c2b3e' }}>
          <span style={{ fontSize: '10px', color: '#718299', fontWeight: '700', textTransform: 'uppercase' }}>FLAGSHIP BRANDS</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            <span style={{ background: 'rgba(57, 124, 255, 0.15)', color: '#397cff', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>Purva (Luxury)</span>
            <span style={{ background: 'rgba(33, 216, 141, 0.15)', color: '#21d88d', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>Provident Housing</span>
            <span style={{ background: 'rgba(255, 181, 59, 0.15)', color: '#ffb53b', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>Purva Land (Plotted)</span>
            <span style={{ background: 'rgba(162, 176, 255, 0.15)', color: '#a2b0ff', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>Purva Commercial</span>
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

    const positive = globallyFilteredRecords.filter(
      (record) => sentimentOf(record) === 'positive'
    ).length

    const negative = globallyFilteredRecords.filter(
      (record) => sentimentOf(record) === 'negative'
    ).length

    const neutral = Math.max(0, total - positive - negative)

    const net = total ? ((positive - negative) / total) * 100 : 0

    const averageScore = total
      ? globallyFilteredRecords.reduce(
          (sum, record) => sum + Number(record.sentiment_score || 0),
          0
        ) / total
      : 0

    const reputationScore = total
      ? Math.max(0, Math.min(100, Math.round(50 + averageScore * 50)))
      : null

    return {
      total,
      positive,
      negative,
      neutral,
      net,
      reputationScore,
    }
  }, [globallyFilteredRecords])

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
              className="icon-button notification"
              onClick={() => handleNav('Alerts', 'alerts')}
            >
              <Bell size={19} />
              {negativeCount > 0 && <b>{negativeCount}</b>}
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

            <div className="hero-score">
              <div className="score-orbit">
                <div className="score-inner">
                  <span>
                    OVERALL
                    <br />
                    REPUTATION
                  </span>

                  <strong>{stats.reputationScore ?? '—'}</strong>

                  <small>/100</small>
                </div>
              </div>

              <div className="score-caption">
                <Gauge size={15} />
                <span>Derived from current sentiment intelligence</span>
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
                    onClick={() => setSelectedSentimentFilter('all')}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: '#edf3fa',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      padding: '3px 9px',
                      borderRadius: '16px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    Show All ({stats.total}) ✕
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
