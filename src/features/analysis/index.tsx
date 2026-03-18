import { useEffect, useRef, useState, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  TrendingUp, TrendingDown, RefreshCw, Activity, Target,
  Shield, Zap, BarChart2, AlertCircle, ChevronUp, ChevronDown,
  Bot, Newspaper, Sparkles, CheckCircle2,
} from 'lucide-react'
import {
  createChart, ColorType, CrosshairMode, CandlestickSeries,
} from 'lightweight-charts'
import {
  analysisApi, INSTRUMENTS, INTERVALS,
  type TradeSignal, type Analysis, type AISignal,
} from '@/lib/analysis-api'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ── helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
const fmtCurrency = (v: number) => `₹${fmt(v)}`

function isMarketOpen(): boolean {
  const now = new Date()
  const ist = new Date(now.getTime() + (5.5 * 3600000) - now.getTimezoneOffset() * 60000)
  const day = ist.getDay()
  if (day === 0 || day === 6) return false
  const hhmm = ist.getHours() * 100 + ist.getMinutes()
  return hhmm >= 915 && hhmm < 1530
}

// ── sub-components ───────────────────────────────────────────────────────────

function IBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
      active ? 'bg-indigo-600 text-white shadow shadow-indigo-200 dark:shadow-indigo-900'
             : 'text-muted-foreground border border-border hover:border-indigo-300 hover:text-indigo-600'}`}>
      {label}
    </button>
  )
}

function IvBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
      active ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
             : 'text-muted-foreground hover:bg-muted'}`}>
      {label}
    </button>
  )
}

function SignalCard({ signal }: { signal: TradeSignal }) {
  const isLong = signal.direction === 'LONG'
  const dots = Math.min(signal.confluence, 4)
  return (
    <div className={`rounded-xl border p-3 space-y-2.5 ${
      isLong ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-800/60 dark:bg-emerald-950/20'
             : 'border-rose-200 bg-rose-50/40 dark:border-rose-800/60 dark:bg-rose-950/20'}`}>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-1.5 min-w-0'>
          {isLong
            ? <TrendingUp className='h-3.5 w-3.5 text-emerald-500 shrink-0' />
            : <TrendingDown className='h-3.5 w-3.5 text-rose-500 shrink-0' />}
          <span className={`text-xs font-bold ${isLong ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {signal.direction}
          </span>
          <span className='text-xs text-muted-foreground truncate'>{signal.strategy}</span>
        </div>
        <div className='flex items-center gap-1.5 shrink-0'>
          <div className='flex gap-0.5'>
            {[1,2,3,4].map(i => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= dots ? (isLong ? 'bg-emerald-500' : 'bg-rose-500') : 'bg-muted'}`} />
            ))}
          </div>
          <Badge variant='outline' className={`text-[10px] h-4 px-1 ${
            signal.strength === 'High' ? 'border-amber-400 text-amber-600' : 'border-slate-300 text-slate-500'}`}>
            {signal.strength}
          </Badge>
        </div>
      </div>
      <p className='text-[11px] text-muted-foreground leading-relaxed'>{signal.reason}</p>
      <div className='grid grid-cols-3 gap-1.5'>
        <div className='rounded-lg bg-background/80 p-1.5 text-center border border-border/40'>
          <div className='text-[10px] text-muted-foreground flex items-center justify-center gap-0.5 mb-0.5'>
            <Target className='h-2.5 w-2.5' /> Entry
          </div>
          <div className='text-xs font-bold'>{fmtCurrency(signal.entry)}</div>
        </div>
        <div className='rounded-lg bg-background/80 p-1.5 text-center border border-rose-200/40'>
          <div className='text-[10px] text-muted-foreground flex items-center justify-center gap-0.5 mb-0.5'>
            <Shield className='h-2.5 w-2.5' /> SL
          </div>
          <div className='text-xs font-bold text-rose-600 dark:text-rose-400'>{fmtCurrency(signal.sl)}</div>
        </div>
        <div className='rounded-lg bg-background/80 p-1.5 text-center border border-emerald-200/40'>
          <div className='text-[10px] text-muted-foreground flex items-center justify-center gap-0.5 mb-0.5'>
            <Zap className='h-2.5 w-2.5' /> TP
          </div>
          <div className='text-xs font-bold text-emerald-600 dark:text-emerald-400'>{fmtCurrency(signal.tp)}</div>
        </div>
      </div>
      <div className='text-[10px] text-muted-foreground text-right'>
        R:R = <span className='font-semibold text-foreground'>1:{(signal.rr ?? 0).toFixed(1)}</span>
        <span className='ml-2'>Confluence: {signal.confluence}/4</span>
      </div>
    </div>
  )
}

function IndRow({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className='flex items-center justify-between py-1.5 border-b border-border/30 last:border-0'>
      <span className='text-xs text-muted-foreground'>{label}</span>
      <div className='text-right'>
        <span className={`text-xs font-semibold font-mono ${color ?? 'text-foreground'}`}>{value}</span>
        {sub && <span className='text-[10px] text-muted-foreground ml-1'>{sub}</span>}
      </div>
    </div>
  )
}

// ── Candlestick chart ────────────────────────────────────────────────────────

// Returns the floor UTC epoch (seconds) of the candle period containing `nowEpochSec`
// aligned to IST (UTC+5:30). Interval is in minutes.
function candlePeriodStart(nowEpochSec: number, intervalMin: number): number {
  const intervalSec = intervalMin * 60
  // Align to IST day boundary: IST offset = 19800s
  const IST_OFFSET = 19800
  const ist = nowEpochSec + IST_OFFSET
  // How many seconds into today (IST) are we?
  const dayStart = Math.floor(ist / 86400) * 86400  // midnight IST
  const secsIntoDay = ist - dayStart
  const periodInDay = Math.floor(secsIntoDay / intervalSec) * intervalSec
  // Convert back to UTC
  return (dayStart + periodInDay) - IST_OFFSET
}

function CandleChart({
  candles, ltp, symbol, interval, signals, srLevels,
}: {
  candles: [number, number, number, number, number, number][]
  ltp: number
  symbol: string
  interval: number
  signals?: TradeSignal[]
  srLevels?: number[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const seriesRef = useRef<any>(null)
  const priceLineRefs = useRef<any[]>([])

  const liveCandleRef = useRef<{
    time: number
    open: number; high: number; low: number; close: number
  } | null>(null)

  const IST_OFFSET = 5.5 * 60 * 60

  // ── Build chart once ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    const isDark = document.documentElement.classList.contains('dark')

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#09090b' : '#ffffff' },
        textColor: isDark ? '#a1a1aa' : '#52525b',
      },
      grid: {
        vertLines: { color: isDark ? '#1e1e22' : '#f4f4f5' },
        horzLines: { color: isDark ? '#1e1e22' : '#f4f4f5' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: isDark ? '#27272a' : '#e4e4e7' },
      timeScale: {
        borderColor: isDark ? '#27272a' : '#e4e4e7',
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height: 500,
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981', downColor: '#f43f5e',
      borderUpColor: '#10b981', borderDownColor: '#f43f5e',
      wickUpColor: '#10b981', wickDownColor: '#f43f5e',
    })

    chartRef.current = chart
    seriesRef.current = series

    const resize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth })
    }
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      chart.remove()
      liveCandleRef.current = null
    }
  }, [])

  // ── Load candle history ───────────────────────────────────────────────────
  useEffect(() => {
    if (!seriesRef.current || !candles.length) return
    seriesRef.current.setData(candles.map(([t, o, h, l, c]) => ({
      time: (t + IST_OFFSET) as any, open: o, high: h, low: l, close: c,
    })))
    chartRef.current?.timeScale().fitContent()

    const last = candles[candles.length - 1]
    const nowEpoch = Math.floor(Date.now() / 1000)
    const periodStart = candlePeriodStart(nowEpoch, interval)
    const lastPeriod  = candlePeriodStart(last[0], interval)
    liveCandleRef.current = periodStart === lastPeriod
      ? { time: last[0] + IST_OFFSET, open: last[1], high: last[2], low: last[3], close: last[4] }
      : null
  }, [candles, interval])

  // ── Live tick ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!seriesRef.current || !ltp || !candles.length) return
    const nowEpoch   = Math.floor(Date.now() / 1000)
    const periodStart = candlePeriodStart(nowEpoch, interval)
    const chartTime  = (periodStart + IST_OFFSET) as any
    const prev = liveCandleRef.current
    if (!prev || chartTime > prev.time) {
      const c = { time: chartTime, open: ltp, high: ltp, low: ltp, close: ltp }
      liveCandleRef.current = c
      seriesRef.current.update(c)
    } else {
      const c = { time: prev.time, open: prev.open,
        high: Math.max(prev.high, ltp), low: Math.min(prev.low, ltp), close: ltp }
      liveCandleRef.current = c
      seriesRef.current.update(c)
    }
  }, [ltp])

  // ── S/R + Signal price lines — redrawn whenever signals or srLevels change ─
  useEffect(() => {
    if (!seriesRef.current) return
    // Clear all existing price lines
    priceLineRefs.current.forEach(l => { try { seriesRef.current.removePriceLine(l) } catch {} })
    priceLineRefs.current = []

    const add = (price: number, color: string, title: string, style = 0, width = 1) => {
      const l = seriesRef.current.createPriceLine({
        price, color, lineWidth: width, lineStyle: style,
        axisLabelVisible: true, title,
      })
      priceLineRefs.current.push(l)
    }

    // S/R levels — subtle dashed grey lines
    srLevels?.forEach(lvl => {
      const isAbove = ltp > 0 && lvl > ltp
      add(lvl, isAbove ? 'rgba(239,68,68,0.55)' : 'rgba(16,185,129,0.55)', '', 2, 1)
    })

    // Top-3 highest-confluence signals — draw Entry / SL / TP
    const top = (signals ?? []).slice(0, 3)
    top.forEach((sig, idx) => {
      const isLong = sig.direction === 'LONG'
      const label  = `#${idx + 1}`
      // Entry — solid blue/orange line
      add(sig.entry, isLong ? '#6366f1' : '#f97316', `${label} Entry`, 0, 2)
      // SL — dashed red
      add(sig.sl,    '#f43f5e', `${label} SL`, 2, 1)
      // TP — dashed green
      add(sig.tp,    '#10b981', `${label} TP`, 2, 1)
    })
  }, [signals, srLevels, ltp])

  return (
    <div>
      <div className='flex items-center justify-between mb-2 px-1'>
        <span className='text-xs font-medium text-muted-foreground'>{symbol} · {interval === 1440 ? '1D' : `${interval}m`} candles</span>
        <div className='flex items-center gap-3 text-[10px] text-muted-foreground'>
          <span className='flex items-center gap-1'><span className='inline-block w-3 h-0.5 bg-rose-400/70'></span><span className='inline-block w-3 h-0.5 bg-emerald-500/70'></span> S/R</span>
          {(signals?.length ?? 0) > 0 && (
            <span className='flex items-center gap-1'>
              <span className='inline-block w-3 h-0.5 bg-indigo-500'></span> Entry
              <span className='inline-block w-3 h-0.5 border-t border-dashed border-rose-400 mt-px'></span> SL
              <span className='inline-block w-3 h-0.5 border-t border-dashed border-emerald-400 mt-px'></span> TP
            </span>
          )}
        </div>
      </div>
      <div className='relative rounded-xl overflow-hidden border border-border/50'>
        <div ref={containerRef} />
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function TradingAnalysis() {
  const [symbol, setSymbol] = useState('NIFTY')
  const [interval, setInterval] = useState(5)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastLtp, setLastLtp] = useState<number | null>(null)
  const [aiSignal, setAiSignal] = useState<AISignal | null>(null)
  const [aiNews, setAiNews] = useState<{ title: string }[]>([])
  const [sigFilter, setSigFilter] = useState<'all' | 'high' | 'long' | 'short' | 'ai'>('all')
  const [marketOpen, setMarketOpen] = useState(isMarketOpen)

  useEffect(() => {
    const id = window.setInterval(() => setMarketOpen(isMarketOpen()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['analysis-signals', symbol, interval],
    queryFn: () => analysisApi.getSignals(symbol, interval),
    refetchInterval: autoRefresh ? 10000 : false,
    retry: 1,
    staleTime: 4000,
  })

  const { data: candlesData } = useQuery({
    queryKey: ['analysis-candles', symbol, interval],
    queryFn: () => analysisApi.getCandles(symbol, interval),
    refetchInterval: autoRefresh ? 30000 : false,
    retry: 1,
    staleTime: 15000,
  })

  const { data: quoteData } = useQuery({
    queryKey: ['analysis-quote', symbol],
    queryFn: () => analysisApi.getQuote(symbol),
    refetchInterval: marketOpen ? 1000 : false,
    enabled: candlesData !== undefined,
    retry: false,
    staleTime: 0,
  })

  const ltp = quoteData?.ltp ?? data?.ltp ?? lastLtp ?? 0

  useEffect(() => { if (data?.ltp) setLastLtp(data.ltp) }, [data?.ltp])

  const aiMutation = useMutation({
    mutationFn: () => analysisApi.getAISignal(symbol, interval),
    onSuccess: (res) => { setAiSignal(res.ai_signal); setAiNews(res.news ?? []) },
  })

  const handleSymbolChange = useCallback((s: string) => {
    setSymbol(s); setLastLtp(null); setAiSignal(null); setAiNews([])
  }, [])

  const errMsg = (error as any)?.response?.data?.detail ?? 'Failed to fetch data.'
  const analysis: Analysis | undefined = data?.analysis
  const candles = candlesData?.candles ?? []
  const signals = analysis?.signals ?? []
  const ind = analysis?.indicators

  const filteredSigs = signals.filter(s => {
    if (sigFilter === 'high') return s.strength === 'High'
    if (sigFilter === 'long') return s.direction === 'LONG'
    if (sigFilter === 'short') return s.direction === 'SHORT'
    return true
  })
  const longCount = signals.filter(s => s.direction === 'LONG').length
  const shortCount = signals.filter(s => s.direction === 'SHORT').length
  const highCount = signals.filter(s => s.strength === 'High').length

  // Indicator color helpers
  const abv = (v?: number | null) => v && ltp > v ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
  const rsiColor = (v?: number | null) => !v ? '' : v > 70 ? 'text-rose-600 dark:text-rose-400' : v < 30 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
  const macdColor = (v?: number | null) => !v ? '' : v > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'

  return (
    <>
      <Header>
        <div className='ms-auto flex items-center space-x-4'>
          <Search /><ThemeSwitch /><ConfigDrawer /><ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-col gap-3'>

        {/* ── Controls row ── */}
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h1 className='text-lg font-bold tracking-tight'>Trading Analysis</h1>
            <p className='text-xs text-muted-foreground'>20 strategies · live ticks · confluence scoring</p>
          </div>
          <div className='flex items-center gap-1.5 flex-wrap'>
            <div className='flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5'>
              {INTERVALS.map(iv => (
                <IvBtn key={iv.value} label={iv.label} active={interval === iv.value} onClick={() => setInterval(iv.value)} />
              ))}
            </div>
            <Button size='sm' variant={autoRefresh ? 'default' : 'outline'}
              className={`gap-1 h-7 text-xs px-2 ${autoRefresh ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}`}
              onClick={() => setAutoRefresh(p => !p)}>
              <Activity className={`h-3 w-3 ${autoRefresh ? 'animate-pulse' : ''}`} />
              {autoRefresh ? 'Live' : 'Go Live'}
            </Button>
            <Button size='sm' variant='outline' className='gap-1 h-7 text-xs px-2' onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* ── Instrument selector ── */}
        <div className='flex flex-wrap gap-1.5'>
          {INSTRUMENTS.map(i => <IBtn key={i} label={i} active={symbol === i} onClick={() => handleSymbolChange(i)} />)}
        </div>

        {isError && (
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' /><AlertDescription>{errMsg}</AlertDescription>
          </Alert>
        )}

        {/* ── KPI strip ── */}
        <div className='grid grid-cols-2 sm:grid-cols-5 gap-2'>
          <Card className='border-0 shadow-sm col-span-2 sm:col-span-1'>
            <CardContent className='p-3'>
              <div className='text-xs text-muted-foreground mb-1 flex items-center gap-1.5'>
                {marketOpen ? (
                  <span className='relative flex h-2 w-2'>
                    <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75' />
                    <span className='relative inline-flex rounded-full h-2 w-2 bg-emerald-500' />
                  </span>
                ) : <span className='inline-flex rounded-full h-2 w-2 bg-zinc-400' />}
                {symbol} · {marketOpen ? 'Live' : 'Closed'}
              </div>
              {isLoading ? <Skeleton className='h-7 w-24' />
                : <div className='text-xl font-bold tabular-nums'>{ltp > 0 ? fmtCurrency(ltp) : '—'}</div>}
            </CardContent>
          </Card>
          {[
            { label: 'Trend', value: ind?.trend ? ind.trend.charAt(0).toUpperCase() + ind.trend.slice(1) : '—',
              color: ind?.trend === 'bullish' ? 'text-emerald-600' : ind?.trend === 'bearish' ? 'text-rose-600' : '',
              icon: ind?.trend === 'bullish' ? <ChevronUp className='h-3.5 w-3.5' /> : ind?.trend === 'bearish' ? <ChevronDown className='h-3.5 w-3.5' /> : null },
            { label: 'High Prob', value: String(highCount), color: 'text-amber-600' },
            { label: 'Long', value: String(longCount), color: 'text-emerald-600' },
            { label: 'Short', value: String(shortCount), color: 'text-rose-600' },
          ].map(({ label, value, color, icon }) => (
            <Card key={label} className='border-0 shadow-sm'>
              <CardContent className='p-3'>
                <div className='text-xs text-muted-foreground mb-1'>{label}</div>
                {isLoading ? <Skeleton className='h-6 w-12' />
                  : <div className={`text-lg font-bold flex items-center gap-1 ${color}`}>{icon}{value}</div>}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Chart ── */}
        <Card className='border-0 shadow-sm'>
          <CardContent className='p-2'>
            {isLoading
              ? <Skeleton className='h-[480px] w-full rounded-xl' />
              : candles.length > 0
              ? <CandleChart candles={candles} ltp={ltp} symbol={symbol} interval={interval}
                  signals={signals} srLevels={analysis?.sr_levels} />
              : <div className='h-[480px] flex items-center justify-center text-sm text-muted-foreground'>
                  No candle data available.
                </div>}
          </CardContent>
        </Card>

        {/* ── Bottom 2-col grid ── */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-3'>

          {/* Col 1: Signals */}
          <Card className='border-0 shadow-sm flex flex-col'>
            <CardHeader className='pb-2 pt-3 px-4'>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-sm font-semibold flex items-center gap-1.5'>
                  <BarChart2 className='h-4 w-4 text-indigo-500' /> Signals
                  {signals.length > 0 && <Badge className='bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] h-4 px-1'>{signals.length}</Badge>}
                </CardTitle>
              </div>
              <Tabs value={sigFilter} onValueChange={v => setSigFilter(v as any)}>
                <TabsList className='h-6 text-xs mt-1'>
                  <TabsTrigger value='all' className='text-[10px] h-5 px-2'>All</TabsTrigger>
                  <TabsTrigger value='high' className='text-[10px] h-5 px-2'>High ({highCount})</TabsTrigger>
                  <TabsTrigger value='long' className='text-[10px] h-5 px-2'>Long ({longCount})</TabsTrigger>
                  <TabsTrigger value='short' className='text-[10px] h-5 px-2'>Short ({shortCount})</TabsTrigger>
                  <TabsTrigger value='ai' className='text-[10px] h-5 px-2 flex items-center gap-0.5'>
                    <Sparkles className='h-2.5 w-2.5' /> AI
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className='px-4 pb-4 flex-1 overflow-y-auto max-h-[600px]'>
              {sigFilter === 'ai' ? (
                /* ── AI Signal tab ── */
                <div className='space-y-3'>
                  {aiMutation.isPending ? (
                    <div className='flex flex-col items-center justify-center py-10'>
                      <Bot className='h-8 w-8 text-muted-foreground/30 mb-2 animate-pulse' />
                      <p className='text-xs text-muted-foreground'>Generating signal...</p>
                    </div>
                  ) : aiSignal ? (
                    <div className={`rounded-xl border p-3 space-y-2.5 ${
                      aiSignal.direction === 'LONG' ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-800/60 dark:bg-emerald-950/20'
                      : aiSignal.direction === 'SHORT' ? 'border-rose-200 bg-rose-50/40 dark:border-rose-800/60 dark:bg-rose-950/20'
                      : 'border-zinc-200 bg-zinc-50/40 dark:border-zinc-800/60 dark:bg-zinc-950/20'}`}>
                      <div className='flex items-center justify-between gap-2'>
                        <div className='flex items-center gap-1.5'>
                          {aiSignal.direction === 'LONG' ? <TrendingUp className='h-3.5 w-3.5 text-emerald-500 shrink-0' />
                          : aiSignal.direction === 'SHORT' ? <TrendingDown className='h-3.5 w-3.5 text-rose-500 shrink-0' />
                          : <CheckCircle2 className='h-3.5 w-3.5 text-zinc-500 shrink-0' />}
                          <span className={`text-xs font-bold ${
                            aiSignal.direction === 'LONG' ? 'text-emerald-600 dark:text-emerald-400'
                            : aiSignal.direction === 'SHORT' ? 'text-rose-600 dark:text-rose-400'
                            : 'text-zinc-600 dark:text-zinc-400'}`}>
                            {aiSignal.direction}
                          </span>
                          <Badge variant='outline' className={`text-[10px] h-4 px-1 ${
                            aiSignal.confidence === 'High' ? 'border-amber-400 text-amber-600' : 'border-slate-300 text-slate-500'}`}>
                            {aiSignal.confidence}
                          </Badge>
                        </div>
                        <span className='text-[10px] text-muted-foreground'>Claude AI</span>
                      </div>
                      <p className='text-[11px] text-muted-foreground leading-relaxed'>{aiSignal.reasoning}</p>
                      {aiSignal.direction !== 'NEUTRAL' && (
                        <div className='grid grid-cols-3 gap-1.5'>
                          <div className='rounded-lg bg-background/80 p-1.5 text-center border border-border/40'>
                            <div className='text-[10px] text-muted-foreground flex items-center justify-center gap-0.5 mb-0.5'><Target className='h-2.5 w-2.5' /> Entry</div>
                            <div className='text-xs font-bold'>{fmtCurrency(aiSignal.entry)}</div>
                          </div>
                          <div className='rounded-lg bg-background/80 p-1.5 text-center border border-rose-200/40'>
                            <div className='text-[10px] text-muted-foreground flex items-center justify-center gap-0.5 mb-0.5'><Shield className='h-2.5 w-2.5' /> SL</div>
                            <div className='text-xs font-bold text-rose-600 dark:text-rose-400'>{fmtCurrency(aiSignal.sl)}</div>
                          </div>
                          <div className='rounded-lg bg-background/80 p-1.5 text-center border border-emerald-200/40'>
                            <div className='text-[10px] text-muted-foreground flex items-center justify-center gap-0.5 mb-0.5'><Zap className='h-2.5 w-2.5' /> TP</div>
                            <div className='text-xs font-bold text-emerald-600 dark:text-emerald-400'>{fmtCurrency(aiSignal.tp)}</div>
                          </div>
                        </div>
                      )}
                      {aiSignal.direction !== 'NEUTRAL' && (
                        <div className='text-[10px] text-muted-foreground text-right'>
                          R:R = <span className='font-semibold text-foreground'>1:{aiSignal.rr_ratio.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className='flex flex-col items-center justify-center py-10 text-center'>
                      <Sparkles className='h-8 w-8 text-muted-foreground/30 mb-2' />
                      <p className='text-sm text-muted-foreground font-medium'>No AI signal yet</p>
                      <p className='text-xs text-muted-foreground mt-1'>Click below to generate a signal.</p>
                    </div>
                  )}
                  {aiNews.length > 0 && (
                    <div className='space-y-1.5'>
                      <p className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wide'>Related News</p>
                      {aiNews.map((n, i) => (
                        <div key={i} className='flex items-center gap-2 text-xs text-muted-foreground'>
                          <Newspaper className='h-3 w-3 shrink-0' />
                          <span className='line-clamp-1'>{n.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button size='sm' className='w-full gap-1.5 h-8 text-xs' onClick={() => aiMutation.mutate()} disabled={aiMutation.isPending}>
                    <Bot className='h-3 w-3' />
                    {aiMutation.isPending ? 'Generating...' : 'Generate AI Signal'}
                  </Button>
                </div>
              ) : isLoading ? (
                <div className='space-y-2'>{[1,2,3].map(i => <Skeleton key={i} className='h-28 w-full rounded-xl' />)}</div>
              ) : filteredSigs.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-10 text-center'>
                  <Activity className='h-8 w-8 text-muted-foreground/20 mb-2' />
                  <p className='text-xs text-muted-foreground'>No {sigFilter !== 'all' ? sigFilter : ''} signals right now</p>
                </div>
              ) : (
                <div className='space-y-2'>
                  {filteredSigs.map((s, i) => <SignalCard key={i} signal={s} />)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Col 2+3: Indicators + Patterns + SMC */}
          <div className='lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3'>
          <div className='space-y-3'>
            {/* Core indicators */}
            <Card className='border-0 shadow-sm'>
              <CardHeader className='pb-1 pt-3 px-4'>
                <CardTitle className='text-sm font-semibold'>Indicators</CardTitle>
              </CardHeader>
              <CardContent className='px-4 pb-3'>
                {isLoading ? <div className='space-y-1.5'>{[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className='h-5 w-full' />)}</div>
                : <div>
                    <IndRow label='EMA 9'   value={ind?.ema9  ? fmtCurrency(ind.ema9)  : '—'} color={abv(ind?.ema9)} />
                    <IndRow label='EMA 21'  value={ind?.ema21 ? fmtCurrency(ind.ema21) : '—'} color={abv(ind?.ema21)} />
                    <IndRow label='EMA 50'  value={ind?.ema50 ? fmtCurrency(ind.ema50) : '—'} color={abv(ind?.ema50)} />
                    <IndRow label='EMA 200' value={ind?.ema200 ? fmtCurrency(ind.ema200) : '—'} color={abv(ind?.ema200)} />
                    <IndRow label='RSI 14'  value={ind?.rsi14?.toFixed(1) ?? '—'} color={rsiColor(ind?.rsi14)} />
                    <IndRow label='StochRSI %K' value={ind?.stoch_k?.toFixed(0) ?? '—'} color={rsiColor(ind?.stoch_k)} />
                    <IndRow label='MACD'    value={ind?.macd?.toFixed(1) ?? '—'} sub={`sig ${ind?.macd_signal?.toFixed(1) ?? '—'}`} color={macdColor(ind?.macd)} />
                    <IndRow label='MACD Hist' value={ind?.macd_hist?.toFixed(1) ?? '—'} color={macdColor(ind?.macd_hist)} />
                    <IndRow label='ATR 14'  value={ind?.atr14 ? fmtCurrency(ind.atr14) : '—'} />
                    <IndRow label='VWAP'    value={ind?.vwap ? fmtCurrency(ind.vwap) : '—'} color={abv(ind?.vwap)} />
                    <IndRow label='BB Upper' value={ind?.bb_upper ? fmtCurrency(ind.bb_upper) : '—'} />
                    <IndRow label='BB Lower' value={ind?.bb_lower ? fmtCurrency(ind.bb_lower) : '—'} />
                    <IndRow label='BB %'    value={ind?.bb_pct != null ? `${ind.bb_pct}%` : '—'} color={ind?.bb_pct != null ? ind.bb_pct > 80 ? 'text-rose-600' : ind.bb_pct < 20 ? 'text-emerald-600' : '' : ''} />
                    <IndRow label='Supertrend' value={ind?.supertrend ? fmtCurrency(ind.supertrend) : '—'}
                      color={ind?.supertrend_dir === 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}
                      sub={ind?.supertrend_dir === 1 ? '▲ Bull' : ind?.supertrend_dir === -1 ? '▼ Bear' : ''} />
                    {ind?.vol_spike && <div className='mt-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1'>⚡ Volume Spike Detected</div>}
                  </div>}
              </CardContent>
            </Card>

            {/* S&R */}
            <Card className='border-0 shadow-sm'>
              <CardHeader className='pb-1 pt-3 px-4'>
                <CardTitle className='text-sm font-semibold'>Support & Resistance</CardTitle>
              </CardHeader>
              <CardContent className='px-4 pb-3'>
                {isLoading ? <div className='space-y-1'>{[1,2,3,4].map(i => <Skeleton key={i} className='h-6 w-full' />)}</div>
                : !analysis?.sr_levels?.length ? <p className='text-xs text-muted-foreground'>Not enough data</p>
                : <div className='space-y-1'>
                    {[...analysis.sr_levels].reverse().slice(0, 10).map((lvl, i) => {
                      const isAbove = lvl > ltp
                      const dist = ltp > 0 ? ((lvl - ltp) / ltp * 100) : 0
                      const near = Math.abs(dist) < 0.3
                      return (
                        <div key={i} className={`flex items-center justify-between rounded-lg px-2 py-1 text-xs ${near ? 'bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800' : 'bg-muted/30'}`}>
                          <span className={`font-semibold font-mono text-[11px] ${isAbove ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{fmtCurrency(lvl)}</span>
                          <span className='text-[10px] text-muted-foreground'>{isAbove ? '▲' : '▼'} {Math.abs(dist).toFixed(2)}%{near ? ' ⚡' : ''}</span>
                        </div>
                      )
                    })}
                  </div>}
              </CardContent>
            </Card>
          </div>

          {/* Col 3: Patterns + SMC */}
          <div className='space-y-3'>
            {/* Candlestick Patterns */}
            <Card className='border-0 shadow-sm'>
              <CardHeader className='pb-1 pt-3 px-4'>
                <CardTitle className='text-sm font-semibold'>Candlestick Patterns</CardTitle>
              </CardHeader>
              <CardContent className='px-4 pb-3'>
                {isLoading ? <div className='space-y-1'>{[1,2].map(i => <Skeleton key={i} className='h-8 w-full rounded-lg' />)}</div>
                : !analysis?.patterns?.length ? <p className='text-xs text-muted-foreground'>No patterns on last 2 candles</p>
                : <div className='space-y-1.5'>
                    {analysis.patterns.map((p, i) => (
                      <div key={i} className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs border ${
                        p.direction === 'LONG' ? 'bg-emerald-50/60 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/50'
                        : p.direction === 'SHORT' ? 'bg-rose-50/60 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800/50'
                        : 'bg-muted/40 border-border/40'}`}>
                        <span className='font-medium'>{p.type}</span>
                        <Badge variant='outline' className={`text-[10px] h-4 px-1 ${p.direction === 'LONG' ? 'border-emerald-400 text-emerald-600' : p.direction === 'SHORT' ? 'border-rose-400 text-rose-600' : 'border-zinc-400 text-zinc-500'}`}>
                          {p.direction}
                        </Badge>
                      </div>
                    ))}
                  </div>}
              </CardContent>
            </Card>

            {/* Smart Money: FVG + OB + BOS */}
            <Card className='border-0 shadow-sm'>
              <CardHeader className='pb-1 pt-3 px-4'>
                <CardTitle className='text-sm font-semibold'>Smart Money Concepts</CardTitle>
              </CardHeader>
              <CardContent className='px-4 pb-3 space-y-3'>
                {/* FVGs */}
                <div>
                  <p className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1'>Fair Value Gaps</p>
                  {!analysis?.fvgs?.length ? <p className='text-xs text-muted-foreground'>None</p>
                  : <div className='space-y-1'>
                      {analysis.fvgs.map((fvg, i) => (
                        <div key={i} className={`flex items-center justify-between rounded px-2 py-1 text-xs ${fvg.type === 'bullish' ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : 'bg-rose-50/60 dark:bg-rose-950/20'}`}>
                          <span className={`font-medium capitalize ${fvg.type === 'bullish' ? 'text-emerald-600' : 'text-rose-600'}`}>{fvg.type}</span>
                          <span className='font-mono text-[10px] text-muted-foreground'>{fmtCurrency(fvg.bottom)}–{fmtCurrency(fvg.top)}</span>
                          {ltp >= fvg.bottom && ltp <= fvg.top && <span className='text-amber-500 text-[10px] font-bold'>⚡IN</span>}
                        </div>
                      ))}
                    </div>}
                </div>
                {/* Order Blocks */}
                <div>
                  <p className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1'>Order Blocks</p>
                  {!analysis?.order_blocks?.length ? <p className='text-xs text-muted-foreground'>None</p>
                  : <div className='space-y-1'>
                      {analysis.order_blocks.slice(-4).map((ob, i) => (
                        <div key={i} className={`flex items-center justify-between rounded px-2 py-1 text-xs ${ob.type === 'bullish' ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : 'bg-rose-50/60 dark:bg-rose-950/20'}`}>
                          <span className={`font-medium capitalize ${ob.type === 'bullish' ? 'text-emerald-600' : 'text-rose-600'}`}>{ob.type} OB</span>
                          <span className='font-mono text-[10px] text-muted-foreground'>{fmtCurrency(ob.bottom)}–{fmtCurrency(ob.top)}</span>
                          {ltp >= ob.bottom && ltp <= ob.top && <span className='text-amber-500 text-[10px] font-bold'>⚡IN</span>}
                        </div>
                      ))}
                    </div>}
                </div>
                {/* BOS/ChoCh */}
                <div>
                  <p className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1'>BOS / ChoCh</p>
                  {!analysis?.bos_choch?.length ? <p className='text-xs text-muted-foreground'>None recent</p>
                  : <div className='space-y-1'>
                      {analysis.bos_choch.map((b, i) => (
                        <div key={i} className={`flex items-center justify-between rounded px-2 py-1 text-xs ${b.direction === 'LONG' ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : 'bg-rose-50/60 dark:bg-rose-950/20'}`}>
                          <span className={`font-bold ${b.direction === 'LONG' ? 'text-emerald-600' : 'text-rose-600'}`}>{b.type}</span>
                          <span className='font-mono text-[10px] text-muted-foreground'>@ {fmtCurrency(b.level)}</span>
                          <Badge variant='outline' className={`text-[10px] h-4 px-1 ${b.direction === 'LONG' ? 'border-emerald-400 text-emerald-600' : 'border-rose-400 text-rose-600'}`}>{b.direction}</Badge>
                        </div>
                      ))}
                    </div>}
                </div>
                {/* Liq Sweeps */}
                {(analysis?.liquidity_sweeps?.length ?? 0) > 0 && (
                  <div>
                    <p className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1'>Liquidity Sweeps</p>
                    <div className='space-y-1'>
                      {analysis!.liquidity_sweeps.map((sw, i) => (
                        <div key={i} className={`flex items-center justify-between rounded px-2 py-1 text-xs ${sw.type === 'bullish_sweep' ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : 'bg-rose-50/60 dark:bg-rose-950/20'}`}>
                          <span className={`font-medium ${sw.type === 'bullish_sweep' ? 'text-emerald-600' : 'text-rose-600'}`}>{sw.type === 'bullish_sweep' ? '▲ Bull' : '▼ Bear'} Sweep</span>
                          <span className='font-mono text-[10px]'>{fmtCurrency(sw.level)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
          </div>
        </div>
      </Main>
    </>
  )
}
