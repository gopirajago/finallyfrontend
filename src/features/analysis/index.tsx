import { useEffect, useRef, useState, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  TrendingUp, TrendingDown, RefreshCw, Activity, Target,
  Shield, Zap, BarChart2, AlertCircle, ChevronUp, ChevronDown,
  Bot, Newspaper, Sparkles, CheckCircle2,
} from 'lucide-react'
import { createChart, ColorType, CrosshairMode, CandlestickSeries } from 'lightweight-charts'
import { analysisApi, INSTRUMENTS, INTERVALS, type TradeSignal, type Analysis, type AISignal } from '@/lib/analysis-api'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'

// ── helpers ─────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)

const fmtCurrency = (v: number) => `₹${fmt(v)}`

function isMarketOpen(): boolean {
  // NSE/BSE: Mon–Fri, 09:15 – 15:30 IST (UTC+5:30)
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  const ist = new Date(now.getTime() + istOffset - now.getTimezoneOffset() * 60 * 1000)
  const day = ist.getDay() // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false
  const hhmm = ist.getHours() * 100 + ist.getMinutes()
  return hhmm >= 915 && hhmm < 1530
}

// ── sub-components ───────────────────────────────────────────────────────────

function InstrumentButton({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
        active
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900'
          : 'bg-white dark:bg-zinc-900 text-muted-foreground border border-border hover:border-indigo-300 hover:text-indigo-600 dark:hover:border-indigo-700'
      }`}
    >
      {label}
    </button>
  )
}

function IntervalButton({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
        active
          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
          : 'text-muted-foreground hover:bg-muted'
      }`}
    >
      {label}
    </button>
  )
}

function SignalCard({ signal }: { signal: TradeSignal }) {
  const isLong = signal.direction === 'LONG'
  const rr = signal.tp && signal.sl && signal.entry
    ? Math.abs(signal.tp - signal.entry) / Math.abs(signal.entry - signal.sl)
    : null

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${
      isLong
        ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30'
        : 'border-rose-200 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/30'
    }`}>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          {isLong
            ? <TrendingUp className='h-4 w-4 text-emerald-600 dark:text-emerald-400' />
            : <TrendingDown className='h-4 w-4 text-rose-600 dark:text-rose-400' />
          }
          <span className={`text-sm font-bold ${
            isLong ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
          }`}>
            {signal.direction}
          </span>
          <span className='text-xs text-muted-foreground'>·</span>
          <span className='text-xs font-medium text-muted-foreground'>{signal.strategy}</span>
        </div>
        <Badge
          variant='outline'
          className={`text-xs ${
            signal.strength === 'High'
              ? 'border-amber-400 text-amber-600 dark:text-amber-400'
              : 'border-blue-300 text-blue-600 dark:text-blue-400'
          }`}
        >
          {signal.strength}
        </Badge>
      </div>

      <p className='text-xs text-muted-foreground'>{signal.reason}</p>

      <div className='grid grid-cols-3 gap-2'>
        <div className='rounded-lg bg-white/70 dark:bg-zinc-900/70 p-2 text-center'>
          <div className='text-xs text-muted-foreground mb-0.5 flex items-center justify-center gap-1'>
            <Target className='h-3 w-3' /> Entry
          </div>
          <div className='text-sm font-bold text-foreground'>{fmtCurrency(signal.entry)}</div>
        </div>
        <div className='rounded-lg bg-white/70 dark:bg-zinc-900/70 p-2 text-center'>
          <div className='text-xs text-muted-foreground mb-0.5 flex items-center justify-center gap-1'>
            <Shield className='h-3 w-3' /> SL
          </div>
          <div className='text-sm font-bold text-rose-600 dark:text-rose-400'>{fmtCurrency(signal.sl)}</div>
        </div>
        <div className='rounded-lg bg-white/70 dark:bg-zinc-900/70 p-2 text-center'>
          <div className='text-xs text-muted-foreground mb-0.5 flex items-center justify-center gap-1'>
            <Zap className='h-3 w-3' /> TP
          </div>
          <div className='text-sm font-bold text-emerald-600 dark:text-emerald-400'>{fmtCurrency(signal.tp)}</div>
        </div>
      </div>

      {rr && (
        <div className='text-xs text-muted-foreground text-right'>
          R:R = <span className='font-semibold text-foreground'>1:{rr.toFixed(1)}</span>
        </div>
      )}
    </div>
  )
}

function IndicatorRow({ label, value, color }: { label: string; value: string | null; color?: string }) {
  return (
    <div className='flex items-center justify-between py-1.5 border-b border-border/40 last:border-0'>
      <span className='text-xs text-muted-foreground'>{label}</span>
      <span className={`text-xs font-semibold font-mono ${color ?? 'text-foreground'}`}>
        {value ?? '—'}
      </span>
    </div>
  )
}

// ── Candlestick chart ────────────────────────────────────────────────────────

interface FVG { type: 'bullish' | 'bearish'; top: number; bottom: number }
interface LiqSweep { type: 'bullish_sweep' | 'bearish_sweep'; level: number }

function CandleChart({
  candles, ltp, symbol, interval, fvgs, sweeps,
}: {
  candles: [number, number, number, number, number, number][]
  ltp: number
  symbol: string
  interval: number
  fvgs?: FVG[]
  sweeps?: LiqSweep[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const seriesRef = useRef<any>(null)
  const sweepLinesRef = useRef<any[]>([])
  const fvgCanvasRef = useRef<HTMLCanvasElement>(null)

  // Build chart once
  useEffect(() => {
    if (!containerRef.current) return
    const isDark = document.documentElement.classList.contains('dark')

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#09090b' : '#ffffff' },
        textColor: isDark ? '#a1a1aa' : '#52525b',
      },
      grid: {
        vertLines: { color: isDark ? '#27272a' : '#f4f4f5' },
        horzLines: { color: isDark ? '#27272a' : '#f4f4f5' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: isDark ? '#27272a' : '#e4e4e7' },
      timeScale: {
        borderColor: isDark ? '#27272a' : '#e4e4e7',
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height: 460,
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderUpColor: '#10b981',
      borderDownColor: '#f43f5e',
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
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
    }
  }, [])

  // Set candle data
  useEffect(() => {
    if (!seriesRef.current || !candles.length) return
    const IST_OFFSET = 5.5 * 60 * 60
    const data = candles.map(([t, o, h, l, c]) => ({
      time: (t + IST_OFFSET) as any,
      open: o, high: h, low: l, close: c,
    }))
    seriesRef.current.setData(data)
    chartRef.current?.timeScale().fitContent()
  }, [candles])

  // Live price line
  useEffect(() => {
    if (!seriesRef.current || !ltp || !candles.length) return
    const IST_OFFSET = 5.5 * 60 * 60
    const last = candles[candles.length - 1]
    seriesRef.current.update({
      time: (last[0] + IST_OFFSET) as any,
      open: last[1], high: Math.max(last[2], ltp), low: Math.min(last[3], ltp), close: ltp,
    })
  }, [ltp, candles])

  // Liquidity sweep lines
  useEffect(() => {
    if (!seriesRef.current) return
    sweepLinesRef.current.forEach(l => { try { seriesRef.current.removePriceLine(l) } catch {} })
    sweepLinesRef.current = []
    if (!sweeps?.length) return
    sweeps.forEach(sw => {
      const line = seriesRef.current.createPriceLine({
        price: sw.level,
        color: sw.type === 'bullish_sweep' ? '#10b981' : '#f43f5e',
        lineWidth: 1,
        lineStyle: 3,
        axisLabelVisible: true,
        title: sw.type === 'bullish_sweep' ? '▲ Sweep' : '▼ Sweep',
      })
      sweepLinesRef.current.push(line)
    })
  }, [sweeps])

  // FVG boxes — canvas overlay, redrawn on scroll/zoom
  useEffect(() => {
    const canvas = fvgCanvasRef.current
    const chart = chartRef.current
    const series = seriesRef.current
    if (!canvas || !chart || !series || !fvgs?.length || !candles.length) {
      fvgCanvasRef.current?.getContext('2d')?.clearRect(0, 0, canvas?.width ?? 0, canvas?.height ?? 0)
      return
    }

    const drawFVGs = () => {
      const container = containerRef.current
      if (!container || !canvas) return
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = 460
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      fvgs.forEach(fvg => {
        try {
          const yTop    = series.priceToCoordinate(fvg.top)
          const yBottom = series.priceToCoordinate(fvg.bottom)
          if (yTop == null || yBottom == null) return
          const y1 = Math.min(yTop, yBottom)
          const h  = Math.max(Math.abs(yTop - yBottom), 2)
          ctx.fillStyle   = fvg.type === 'bullish' ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)'
          ctx.strokeStyle = fvg.type === 'bullish' ? 'rgba(16,185,129,0.5)'  : 'rgba(244,63,94,0.5)'
          ctx.fillRect(0, y1, canvas.width - 60, h)
          ctx.setLineDash([4, 3])
          ctx.lineWidth = 1
          ctx.strokeRect(0, y1, canvas.width - 60, h)
          ctx.setLineDash([])
          ctx.font      = '10px system-ui'
          ctx.fillStyle = fvg.type === 'bullish' ? 'rgba(16,185,129,0.9)' : 'rgba(244,63,94,0.9)'
          ctx.fillText(fvg.type === 'bullish' ? '▲ FVG' : '▼ FVG', 6, y1 + h / 2 + 4)
        } catch {}
      })
    }

    drawFVGs()
    chart.timeScale().subscribeVisibleLogicalRangeChange(drawFVGs)
    chart.subscribeCrosshairMove(drawFVGs)
    return () => {
      try { chart.timeScale().unsubscribeVisibleLogicalRangeChange(drawFVGs) } catch {}
      try { chart.unsubscribeCrosshairMove(drawFVGs) } catch {}
    }
  }, [fvgs, candles])

  return (
    <div>
      <div className='flex items-center justify-between mb-2 px-1'>
        <span className='text-xs font-medium text-muted-foreground'>{symbol} · {interval}m candles</span>
        <div className='flex items-center gap-3 text-xs text-muted-foreground'>
          {(fvgs?.length ?? 0) > 0 && (
            <span className='flex items-center gap-1'>
              <span className='inline-block w-3 h-2 rounded-sm bg-emerald-400/40 border border-emerald-400/60'></span>
              <span className='inline-block w-3 h-2 rounded-sm bg-rose-400/40 border border-rose-400/60'></span>
              FVG zones
            </span>
          )}
          {(sweeps?.length ?? 0) > 0 && (
            <span className='flex items-center gap-1'>
              <span className='inline-block w-4 border-t border-dashed border-emerald-400'></span>
              Sweeps
            </span>
          )}
        </div>
      </div>
      <div className='relative rounded-xl overflow-hidden border border-border/50'>
        <div ref={containerRef} />
        <canvas
          ref={fvgCanvasRef}
          className='absolute inset-0 pointer-events-none'
          style={{ width: '100%', height: '460px' }}
        />
      </div>
    </div>
  )
}

// ── AI Signal Card ───────────────────────────────────────────────────────────

function AISignalCard({ signal, news, loading, onRequest }: {
  signal: AISignal | null
  news: { title: string }[]
  loading: boolean
  onRequest: () => void
}) {
  const isLong = signal?.direction === 'LONG'
  const isNeutral = signal?.direction === 'NEUTRAL'

  return (
    <Card className='border-0 shadow-sm h-full flex flex-col'>
      <CardHeader className='pb-2'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-sm font-semibold flex items-center gap-2'>
            <Bot className='h-4 w-4 text-indigo-500' />
            Claude AI Signal
          </CardTitle>
          <Button
            size='sm'
            onClick={onRequest}
            disabled={loading}
            className='gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white h-7 text-xs px-3'
          >
            <Sparkles className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analysing…' : signal ? 'Re-analyse' : 'Ask Claude'}
          </Button>
        </div>
        <CardDescription className='text-xs'>
          AI-powered signal using technicals + live market news
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-3 flex-1'>
        {loading && (
          <div className='space-y-3'>
            <Skeleton className='h-24 w-full rounded-2xl' />
            <Skeleton className='h-16 w-full rounded-xl' />
            <Skeleton className='h-20 w-full rounded-xl' />
          </div>
        )}

        {!loading && signal && (
          <>
            {/* Direction + Confidence */}
            <div className={`rounded-2xl p-4 border ${
              isNeutral
                ? 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50'
                : isLong
                ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/40'
                : 'border-rose-200 bg-rose-50/60 dark:border-rose-800 dark:bg-rose-950/40'
            }`}>
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-2'>
                  {isNeutral
                    ? <Activity className='h-5 w-5 text-zinc-500' />
                    : isLong
                    ? <TrendingUp className='h-5 w-5 text-emerald-600 dark:text-emerald-400' />
                    : <TrendingDown className='h-5 w-5 text-rose-600 dark:text-rose-400' />
                  }
                  <span className={`text-lg font-bold ${
                    isNeutral ? 'text-zinc-700 dark:text-zinc-300'
                    : isLong ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-rose-700 dark:text-rose-300'
                  }`}>{signal.direction}</span>
                  <Badge variant='outline' className={`text-xs ${
                    signal.confidence === 'High'
                      ? 'border-amber-400 text-amber-600 dark:text-amber-400'
                      : signal.confidence === 'Medium'
                      ? 'border-blue-300 text-blue-600 dark:text-blue-400'
                      : 'border-zinc-300 text-zinc-500'
                  }`}>{signal.confidence} Confidence</Badge>
                </div>
                <div className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                  signal.sentiment === 'Bullish'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : signal.sentiment === 'Bearish'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                }`}>
                  {signal.sentiment}
                </div>
              </div>

              {!isNeutral && (
                <div className='grid grid-cols-3 gap-2'>
                  <div className='rounded-xl bg-white/70 dark:bg-zinc-900/70 p-2.5 text-center'>
                    <div className='text-xs text-muted-foreground mb-0.5 flex items-center justify-center gap-1'>
                      <Target className='h-3 w-3' /> Entry
                    </div>
                    <div className='text-sm font-bold'>{fmtCurrency(signal.entry)}</div>
                  </div>
                  <div className='rounded-xl bg-white/70 dark:bg-zinc-900/70 p-2.5 text-center'>
                    <div className='text-xs text-muted-foreground mb-0.5 flex items-center justify-center gap-1'>
                      <Shield className='h-3 w-3' /> SL
                    </div>
                    <div className='text-sm font-bold text-rose-600 dark:text-rose-400'>{fmtCurrency(signal.sl)}</div>
                  </div>
                  <div className='rounded-xl bg-white/70 dark:bg-zinc-900/70 p-2.5 text-center'>
                    <div className='text-xs text-muted-foreground mb-0.5 flex items-center justify-center gap-1'>
                      <Zap className='h-3 w-3' /> TP
                    </div>
                    <div className='text-sm font-bold text-emerald-600 dark:text-emerald-400'>{fmtCurrency(signal.tp)}</div>
                  </div>
                </div>
              )}
              {!isNeutral && (
                <div className='mt-2 text-xs text-right text-muted-foreground'>
                  R:R = <span className='font-semibold text-foreground'>1:{signal.rr_ratio?.toFixed(1)}</span>
                </div>
              )}
            </div>

            {/* Reasoning */}
            <div className='rounded-xl border border-border bg-muted/30 p-3'>
              <p className='text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5'>
                <Bot className='h-3 w-3' /> Claude's Reasoning
              </p>
              <p className='text-xs text-foreground leading-relaxed'>{signal.reasoning}</p>
            </div>

            {/* Key factors */}
            {signal.key_factors?.length > 0 && (
              <div className='space-y-1.5'>
                <p className='text-xs font-medium text-muted-foreground flex items-center gap-1.5'>
                  <CheckCircle2 className='h-3 w-3' /> Key Factors
                </p>
                {signal.key_factors.map((f, i) => (
                  <div key={i} className='flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-1.5'>
                    <span className='text-indigo-500 font-bold text-xs mt-0.5'>·</span>
                    <span className='text-xs text-foreground'>{f}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {!loading && !signal && (
          <div className='flex flex-col items-center justify-center py-8 text-center'>
            <Bot className='h-10 w-10 text-indigo-200 dark:text-indigo-800 mb-3' />
            <p className='text-sm font-medium text-muted-foreground'>Claude is ready to analyse</p>
            <p className='text-xs text-muted-foreground mt-1 max-w-xs'>
              Click <strong>Ask Claude</strong> to get an AI-powered trade signal combining technicals and live news sentiment.
            </p>
          </div>
        )}

        {/* News headlines */}
        {news.length > 0 && (
          <div className='pt-1'>
            <p className='text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5'>
              <Newspaper className='h-3 w-3' /> Latest News Used
            </p>
            <div className='space-y-1.5'>
              {news.map((n, i) => (
                <div key={i} className='rounded-lg bg-muted/30 px-3 py-1.5'>
                  <p className='text-xs text-foreground line-clamp-2'>{n.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
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
  const [showAllSignals, setShowAllSignals] = useState(false)
  const [marketOpen, setMarketOpen] = useState(isMarketOpen)

  // Re-check market status every 30s
  useEffect(() => {
    const id = window.setInterval(() => setMarketOpen(isMarketOpen()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['analysis-signals', symbol, interval],
    queryFn: () => analysisApi.getSignals(symbol, interval),
    refetchInterval: autoRefresh ? 5000 : false,
    retry: 1,
    staleTime: 4000,
  })

  // Live LTP — every 1s during market hours, paused otherwise
  const { data: quoteData } = useQuery({
    queryKey: ['analysis-quote', symbol],
    queryFn: () => analysisApi.getQuote(symbol),
    refetchInterval: marketOpen ? 1000 : false,
    enabled: !!data,
    retry: false,
    staleTime: 0,
  })

  const ltp = quoteData?.ltp ?? data?.ltp ?? lastLtp ?? 0

  useEffect(() => {
    if (data?.ltp) setLastLtp(data.ltp)
  }, [data?.ltp])

  const aiMutation = useMutation({
    mutationFn: () => analysisApi.getAISignal(symbol, interval),
    onSuccess: (res) => {
      setAiSignal(res.ai_signal)
      setAiNews(res.news ?? [])
    },
  })

  const handleSymbolChange = useCallback((s: string) => {
    setSymbol(s)
    setLastLtp(null)
    setAiSignal(null)
    setAiNews([])
    setShowAllSignals(false)
  }, [])

  const errMsg = (error as any)?.response?.data?.detail ?? 'Failed to fetch data.'
  const analysis: Analysis | undefined = data?.analysis
  const candles = data?.candles ?? []
  const signals = analysis?.signals ?? []
  const indicators = analysis?.indicators
  const longSignals = signals.filter(s => s.direction === 'LONG')
  const shortSignals = signals.filter(s => s.direction === 'SHORT')

  return (
    <>
      <Header>
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-col gap-4'>

        {/* ── Row 1: Title + controls ── */}
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h1 className='text-xl font-bold tracking-tight'>Trading Analysis</h1>
            <p className='text-xs text-muted-foreground mt-0.5'>Live strategy signals · Entry · SL · TP</p>
          </div>
          <div className='flex items-center gap-2 flex-wrap'>
            {/* Interval pill */}
            <div className='flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5'>
              {INTERVALS.map(iv => (
                <IntervalButton key={iv.value} label={iv.label} active={interval === iv.value} onClick={() => setInterval(iv.value)} />
              ))}
            </div>
            <Button
              size='sm'
              variant={autoRefresh ? 'default' : 'outline'}
              className={`gap-1.5 h-8 text-xs ${autoRefresh ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}`}
              onClick={() => setAutoRefresh(p => !p)}
            >
              <Activity className={`h-3 w-3 ${autoRefresh ? 'animate-pulse' : ''}`} />
              {autoRefresh ? 'Live' : 'Go Live'}
            </Button>
            <Button size='sm' variant='outline' className='gap-1.5 h-8 text-xs' onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* ── Row 2: Instrument selector ── */}
        <div className='flex flex-wrap gap-1.5'>
          {INSTRUMENTS.map(i => (
            <InstrumentButton key={i} label={i} active={symbol === i} onClick={() => handleSymbolChange(i)} />
          ))}
        </div>

        {/* ── Error ── */}
        {isError && (
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>{errMsg}</AlertDescription>
          </Alert>
        )}

        {/* ── Row 3: Stats bar ── */}
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
          {/* LTP */}
          <Card className='border-0 shadow-sm'>
            <CardContent className='p-3'>
              <div className='text-xs text-muted-foreground mb-1 flex items-center gap-1.5'>
                {marketOpen ? (
                  <span className='relative flex h-2 w-2'>
                    <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75'></span>
                    <span className='relative inline-flex rounded-full h-2 w-2 bg-emerald-500'></span>
                  </span>
                ) : (
                  <span className='inline-flex rounded-full h-2 w-2 bg-zinc-400'></span>
                )}
                {symbol} · {marketOpen ? 'Live' : 'Market Closed'}
              </div>
              {isLoading
                ? <Skeleton className='h-7 w-28' />
                : <div className='text-xl font-bold tracking-tight tabular-nums'>{ltp > 0 ? fmtCurrency(ltp) : '—'}</div>
              }
            </CardContent>
          </Card>
          {/* Trend */}
          <Card className='border-0 shadow-sm'>
            <CardContent className='p-3'>
              <div className='text-xs text-muted-foreground mb-1'>Trend</div>
              {isLoading ? <Skeleton className='h-7 w-20' /> : (
                <div className={`text-sm font-bold flex items-center gap-1.5 ${
                  indicators?.trend === 'bullish' ? 'text-emerald-600 dark:text-emerald-400'
                  : indicators?.trend === 'bearish' ? 'text-rose-600 dark:text-rose-400'
                  : 'text-muted-foreground'
                }`}>
                  {indicators?.trend === 'bullish' ? <ChevronUp className='h-4 w-4' />
                   : indicators?.trend === 'bearish' ? <ChevronDown className='h-4 w-4' /> : null}
                  {indicators?.trend ? indicators.trend.charAt(0).toUpperCase() + indicators.trend.slice(1) : '—'}
                </div>
              )}
            </CardContent>
          </Card>
          {/* Long signals */}
          <Card className='border-0 shadow-sm'>
            <CardContent className='p-3'>
              <div className='text-xs text-muted-foreground mb-1'>Long Signals</div>
              {isLoading ? <Skeleton className='h-7 w-10' /> : (
                <div className='text-xl font-bold text-emerald-600 dark:text-emerald-400'>{longSignals.length}</div>
              )}
            </CardContent>
          </Card>
          {/* Short signals */}
          <Card className='border-0 shadow-sm'>
            <CardContent className='p-3'>
              <div className='text-xs text-muted-foreground mb-1'>Short Signals</div>
              {isLoading ? <Skeleton className='h-7 w-10' /> : (
                <div className='text-xl font-bold text-rose-600 dark:text-rose-400'>{shortSignals.length}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Row 4: Chart (full width) ── */}
        <Card className='border-0 shadow-sm'>
          <CardContent className='p-3'>
            {isLoading
              ? <Skeleton className='h-[460px] w-full rounded-xl' />
              : candles.length > 0
              ? <CandleChart candles={candles} ltp={ltp} symbol={symbol} interval={interval} fvgs={analysis?.fvgs} sweeps={analysis?.liquidity_sweeps} />
              : <div className='h-[460px] flex items-center justify-center text-sm text-muted-foreground'>No candle data. Market may be closed.</div>
            }
          </CardContent>
        </Card>

        {/* ── Row 5: 3-col grid ── */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch'>

          {/* Col 1: Trade Signals */}
          <Card className='border-0 shadow-sm flex flex-col'>
            <CardHeader className='pb-2 pt-4 px-4'>
              <CardTitle className='text-sm font-semibold flex items-center gap-2'>
                <BarChart2 className='h-4 w-4 text-indigo-500' />
                Trade Signals
                {signals.length > 0 && (
                  <Badge className='bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-xs'>
                    {signals.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className='text-xs'>Strategy-based · Entry · SL · TP</CardDescription>
            </CardHeader>
            <CardContent className='px-4 pb-4 flex-1 flex flex-col'>
              {isLoading ? (
                <div className='space-y-3'>{[1,2,3].map(i => <Skeleton key={i} className='h-32 w-full rounded-2xl' />)}</div>
              ) : signals.length === 0 ? (
                <div className='flex-1 flex flex-col items-center justify-center py-10 text-center'>
                  <Activity className='h-8 w-8 text-muted-foreground/30 mb-2' />
                  <p className='text-sm text-muted-foreground font-medium'>No signals detected</p>
                  <p className='text-xs text-muted-foreground mt-1'>Market conditions don't trigger strategies right now.</p>
                </div>
              ) : (
                <>
                  <div className='space-y-3'>
                    {(showAllSignals ? signals : signals.slice(0, 3)).map((s, i) => <SignalCard key={i} signal={s} />)}
                  </div>
                  {signals.length > 3 && (
                    <button
                      onClick={() => setShowAllSignals(p => !p)}
                      className='mt-3 w-full rounded-xl border border-dashed border-indigo-200 dark:border-indigo-800 py-2 text-xs text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors font-medium'
                    >
                      {showAllSignals ? `▲ Show less` : `▼ Show ${signals.length - 3} more signals`}
                    </button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Col 2: Indicators + S&R + FVG + Sweeps */}
          <div className='space-y-3 flex flex-col'>
            {/* Indicators */}
            <Card className='border-0 shadow-sm'>
              <CardHeader className='pb-1 pt-4 px-4'>
                <CardTitle className='text-sm font-semibold'>Indicators</CardTitle>
              </CardHeader>
              <CardContent className='px-4 pb-4'>
                {isLoading
                  ? <div className='space-y-2'>{[1,2,3,4,5].map(i => <Skeleton key={i} className='h-6 w-full' />)}</div>
                  : <div>
                      <IndicatorRow label='EMA 9'  value={indicators?.ema9  ? fmtCurrency(indicators.ema9)  : null} color={indicators?.ema9  && ltp > indicators.ema9  ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} />
                      <IndicatorRow label='EMA 21' value={indicators?.ema21 ? fmtCurrency(indicators.ema21) : null} color={indicators?.ema21 && ltp > indicators.ema21 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} />
                      <IndicatorRow label='EMA 50' value={indicators?.ema50 ? fmtCurrency(indicators.ema50) : null} color={indicators?.ema50 && ltp > indicators.ema50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} />
                      <IndicatorRow label='RSI 14' value={indicators?.rsi14 ? indicators.rsi14.toFixed(1) : null} color={indicators?.rsi14 ? indicators.rsi14 > 70 ? 'text-rose-600 dark:text-rose-400' : indicators.rsi14 < 30 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground' : undefined} />
                      <IndicatorRow label='ATR 14' value={indicators?.atr14 ? fmtCurrency(indicators.atr14) : null} />
                    </div>
                }
              </CardContent>
            </Card>

            {/* S&R */}
            <Card className='border-0 shadow-sm'>
              <CardHeader className='pb-1 pt-4 px-4'>
                <CardTitle className='text-sm font-semibold'>Support & Resistance</CardTitle>
              </CardHeader>
              <CardContent className='px-4 pb-4'>
                {isLoading
                  ? <div className='space-y-2'>{[1,2,3].map(i => <Skeleton key={i} className='h-6 w-full' />)}</div>
                  : !analysis?.sr_levels?.length
                  ? <p className='text-xs text-muted-foreground'>Not enough data</p>
                  : <div className='space-y-1'>
                      {[...analysis.sr_levels].reverse().map((lvl, i) => {
                        const isAbove = lvl > ltp
                        const dist = ltp > 0 ? ((lvl - ltp) / ltp * 100) : 0
                        return (
                          <div key={i} className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs ${Math.abs(dist) < 0.5 ? 'bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800' : 'bg-muted/40'}`}>
                            <span className={`font-semibold font-mono ${isAbove ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{fmtCurrency(lvl)}</span>
                            <span className='text-muted-foreground'>{isAbove ? '▲' : '▼'} {Math.abs(dist).toFixed(2)}%</span>
                          </div>
                        )
                      })}
                    </div>
                }
              </CardContent>
            </Card>

            {/* FVG */}
            <Card className='border-0 shadow-sm'>
              <CardHeader className='pb-1 pt-4 px-4'>
                <CardTitle className='text-sm font-semibold'>Fair Value Gaps</CardTitle>
              </CardHeader>
              <CardContent className='px-4 pb-4'>
                {isLoading
                  ? <div className='space-y-2'>{[1,2].map(i => <Skeleton key={i} className='h-10 w-full rounded-lg' />)}</div>
                  : !analysis?.fvgs?.length
                  ? <p className='text-xs text-muted-foreground'>No FVGs detected</p>
                  : <div className='space-y-2'>
                      {analysis.fvgs.map((fvg, i) => (
                        <div key={i} className={`rounded-lg px-3 py-2 text-xs border ${fvg.type === 'bullish' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'}`}>
                          <div className='flex items-center justify-between'>
                            <span className={`font-semibold capitalize ${fvg.type === 'bullish' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>{fvg.type} FVG</span>
                            <span className='text-muted-foreground font-mono'>{fmtCurrency(fvg.bottom)} – {fmtCurrency(fvg.top)}</span>
                          </div>
                          {ltp >= fvg.bottom && ltp <= fvg.top && <span className='text-amber-600 dark:text-amber-400 font-semibold text-xs'>⚡ Price inside FVG</span>}
                        </div>
                      ))}
                    </div>
                }
              </CardContent>
            </Card>

            {/* Liquidity Sweeps */}
            {(analysis?.liquidity_sweeps?.length ?? 0) > 0 && (
              <Card className='border-0 shadow-sm'>
                <CardHeader className='pb-1 pt-4 px-4'>
                  <CardTitle className='text-sm font-semibold'>Liquidity Sweeps</CardTitle>
                </CardHeader>
                <CardContent className='px-4 pb-4'>
                  <div className='space-y-2'>
                    {analysis!.liquidity_sweeps.map((sw, i) => (
                      <div key={i} className={`rounded-lg px-3 py-2 text-xs border ${sw.type === 'bullish_sweep' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'}`}>
                        <div className='flex items-center justify-between'>
                          <span className={`font-semibold ${sw.type === 'bullish_sweep' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                            {sw.type === 'bullish_sweep' ? '🟢 Bullish Sweep' : '🔴 Bearish Sweep'}
                          </span>
                          <span className='font-mono'>{fmtCurrency(sw.level)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Col 3: Claude AI Signal */}
          <AISignalCard
            signal={aiSignal}
            news={aiNews}
            loading={aiMutation.isPending}
            onRequest={() => aiMutation.mutate()}
          />
        </div>
      </Main>
    </>
  )
}
