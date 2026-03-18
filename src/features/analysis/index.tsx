import { useEffect, useRef, useState, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  TrendingUp, TrendingDown, RefreshCw, Activity, Target,
  Shield, Zap, BarChart2, AlertCircle, ChevronUp, ChevronDown,
  Bot, Newspaper, Sparkles, CheckCircle2,
} from 'lucide-react'
import {
  createChart, ColorType, CrosshairMode, CandlestickSeries, LineSeries,
} from 'lightweight-charts'
import {
  analysisApi, INSTRUMENTS, INTERVALS,
  type TradeSignal, type Analysis, type AISignal, type Overlays,
} from '@/lib/analysis-api'
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

interface FVG { type: 'bullish' | 'bearish'; top: number; bottom: number }
interface LiqSweep { type: 'bullish_sweep' | 'bearish_sweep'; level: number }

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
  candles, ltp, symbol, interval, fvgs, sweeps, overlays,
}: {
  candles: [number, number, number, number, number, number][]
  ltp: number
  symbol: string
  interval: number
  fvgs?: FVG[]
  sweeps?: LiqSweep[]
  overlays?: Overlays
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const seriesRef = useRef<any>(null)
  const sweepLinesRef = useRef<any[]>([])
  const fvgCanvasRef = useRef<HTMLCanvasElement>(null)
  const overlaySeriesRef = useRef<any[]>([])

  // Live candle state — tracked in refs to avoid re-render on every tick
  const liveCandleRef = useRef<{
    time: number   // period-start epoch (UTC, IST-aligned) — chart time key
    open: number
    high: number
    low: number
    close: number
  } | null>(null)

  const IST_OFFSET = 5.5 * 60 * 60  // seconds, used only for chart time display

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
      liveCandleRef.current = null
    }
  }, [])

  // Load historical candle data whenever candles array changes (symbol/interval switch)
  useEffect(() => {
    if (!seriesRef.current || !candles.length) return
    const data = candles.map(([t, o, h, l, c]) => ({
      time: (t + IST_OFFSET) as any,
      open: o, high: h, low: l, close: c,
    }))
    seriesRef.current.setData(data)
    chartRef.current?.timeScale().fitContent()

    // Seed live candle from last historical candle so first tick has correct open/high/low
    const last = candles[candles.length - 1]
    const nowEpoch = Math.floor(Date.now() / 1000)
    const periodStart = candlePeriodStart(nowEpoch, interval)
    const lastCandlePeriod = candlePeriodStart(last[0], interval)

    if (periodStart === lastCandlePeriod) {
      // Current period already exists in historical data — resume it
      liveCandleRef.current = {
        time: last[0] + IST_OFFSET,
        open: last[1], high: last[2], low: last[3], close: last[4],
      }
    } else {
      // Historical data is from a prior period; live candle will be created on first tick
      liveCandleRef.current = null
    }
  }, [candles, interval])

  // ── Overlay lines: EMA, BB, VWAP, Supertrend ────────────────────────────────
  useEffect(() => {
    if (!chartRef.current) return
    // Remove old overlay series
    overlaySeriesRef.current.forEach(s => { try { chartRef.current.removeSeries(s) } catch {} })
    overlaySeriesRef.current = []
    if (!overlays) return

    const addLine = (data: { time: number; value: number }[], color: string, width = 1, dashed = false) => {
      if (!data.length) return
      const s = chartRef.current.addSeries(LineSeries, {
        color,
        lineWidth: width,
        lineStyle: dashed ? 2 : 0,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      })
      s.setData(data as any)
      overlaySeriesRef.current.push(s)
    }

    addLine(overlays.ema9,   '#f59e0b', 1)       // amber — EMA9
    addLine(overlays.ema21,  '#6366f1', 1)       // indigo — EMA21
    addLine(overlays.ema50,  '#10b981', 1)       // emerald — EMA50
    addLine(overlays.vwap,   '#a78bfa', 1, true) // violet dashed — VWAP
    addLine(overlays.bb_upper, '#94a3b8', 1, true) // slate dashed — BB upper
    addLine(overlays.bb_lower, '#94a3b8', 1, true) // slate dashed — BB lower
    addLine(overlays.bb_mid,   '#94a3b8', 1, true) // slate dashed — BB mid

    // Supertrend: split into bull/bear segments
    if (overlays.supertrend?.length) {
      const bullSeg: { time: number; value: number }[] = []
      const bearSeg: { time: number; value: number }[] = []
      overlays.supertrend.forEach(p => {
        if (p.dir === 1) bullSeg.push({ time: p.time, value: p.value })
        else bearSeg.push({ time: p.time, value: p.value })
      })
      addLine(bullSeg, '#10b981', 2) // thick emerald — bull supertrend
      addLine(bearSeg, '#f43f5e', 2) // thick rose — bear supertrend
    }
  }, [overlays])

  // ── Live tick: TradingView-style candle update ──────────────────────────────
  // On each LTP tick:
  //   1. Compute the period-aligned candle start for "now"
  //   2. If same period as liveCandleRef → extend high/low, update close
  //   3. If new period → push current live candle as closed, start fresh candle
  useEffect(() => {
    if (!seriesRef.current || !ltp || !candles.length) return

    const nowEpoch = Math.floor(Date.now() / 1000)
    const periodStart = candlePeriodStart(nowEpoch, interval)
    const chartTime = (periodStart + IST_OFFSET) as any

    const prev = liveCandleRef.current

    if (!prev || chartTime > prev.time) {
      // New candle period — open at LTP
      const newCandle = { time: chartTime, open: ltp, high: ltp, low: ltp, close: ltp }
      liveCandleRef.current = newCandle
      seriesRef.current.update(newCandle)
    } else {
      // Same period — update high/low/close
      const updated = {
        time: prev.time,
        open:  prev.open,
        high:  Math.max(prev.high, ltp),
        low:   Math.min(prev.low,  ltp),
        close: ltp,
      }
      liveCandleRef.current = updated
      seriesRef.current.update(updated)
    }
  }, [ltp])

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
  const [sigFilter, setSigFilter] = useState<'all' | 'high' | 'long' | 'short'>('all')
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
  const overlays = candlesData?.overlays
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
            <p className='text-xs text-muted-foreground'>16 strategies · live ticks · confluence scoring</p>
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
                  fvgs={analysis?.fvgs} sweeps={analysis?.liquidity_sweeps} overlays={overlays} />
              : <div className='h-[480px] flex items-center justify-center text-sm text-muted-foreground'>
                  No candle data available.
                </div>}
          </CardContent>
        </Card>

        {/* ── Bottom 3-col grid ── */}
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
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className='px-4 pb-4 flex-1 overflow-y-auto max-h-[600px]'>
              {isLoading ? (
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

          {/* Col 2: Indicators */}
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

          {/* Col 3: Patterns + SMC + AI */}
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

            {/* Claude AI */}
            <AISignalCard signal={aiSignal} news={aiNews} loading={aiMutation.isPending} onRequest={() => aiMutation.mutate()} />
          </div>
        </div>
      </Main>
    </>
  )
}
