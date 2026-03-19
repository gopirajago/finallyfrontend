import { useEffect, useRef, useState, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  TrendingUp, TrendingDown, RefreshCw, Activity, Target,
  Shield, Zap, BarChart2, AlertCircle, ChevronUp, ChevronDown,
  Bot, Sparkles, CheckCircle2, ArrowUpRight, ArrowDownRight,
  Layers, Eye, EyeOff, Info,
} from 'lucide-react'
import {
  createChart, ColorType, CrosshairMode, CandlestickSeries, LineStyle,
} from 'lightweight-charts'
import {
  analysisApi, INSTRUMENTS, INTERVALS,
  type TradeSignal, type BestTrade, type Analysis, type AISignal,
} from '@/lib/analysis-api'
import { useAuthStore } from '@/stores/auth-store'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

// ── helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
const fmtCurrency = (v: number) => `₹${fmt(v)}`
const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`

function isMarketOpen(): boolean {
  const now = new Date()
  const ist = new Date(now.getTime() + (5.5 * 3600000) - now.getTimezoneOffset() * 60000)
  const day = ist.getDay()
  if (day === 0 || day === 6) return false
  const hhmm = ist.getHours() * 100 + ist.getMinutes()
  return hhmm >= 915 && hhmm < 1530
}

function candlePeriodStart(nowEpochSec: number, intervalMin: number): number {
  const intervalSec = intervalMin * 60
  const IST_OFFSET = 19800
  const ist = nowEpochSec + IST_OFFSET
  const dayStart = Math.floor(ist / 86400) * 86400
  const secsIntoDay = ist - dayStart
  const periodInDay = Math.floor(secsIntoDay / intervalSec) * intervalSec
  return (dayStart + periodInDay) - IST_OFFSET
}

// ── tiny button atoms ─────────────────────────────────────────────────────────

function SymBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
      active
        ? 'bg-indigo-600 text-white shadow shadow-indigo-500/30'
        : 'text-muted-foreground border border-border hover:border-indigo-400 hover:text-indigo-600'
    }`}>
      {label}
    </button>
  )
}

function IvBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
      active ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
             : 'text-muted-foreground hover:bg-muted'
    }`}>
      {label}
    </button>
  )
}

// ── Best Trade Command Center ─────────────────────────────────────────────────

function BestTradeCard({ bt, ltp, isLoading }: { bt: BestTrade | null; ltp: number; isLoading: boolean }) {
  if (isLoading) return (
    <Card className='border-0 shadow-md bg-gradient-to-br from-background to-muted/30'>
      <CardContent className='p-5 space-y-4'>
        <Skeleton className='h-7 w-48' />
        <div className='grid grid-cols-3 gap-3'>
          {[1,2,3].map(i => <Skeleton key={i} className='h-20 w-full rounded-xl' />)}
        </div>
        <Skeleton className='h-16 w-full rounded-xl' />
      </CardContent>
    </Card>
  )

  if (!bt) return (
    <Card className='border-0 shadow-md'>
      <CardContent className='p-5 flex flex-col items-center justify-center h-48 text-center gap-2'>
        <Activity className='h-8 w-8 text-muted-foreground/30' />
        <p className='text-sm font-medium text-muted-foreground'>No actionable setup detected</p>
        <p className='text-xs text-muted-foreground/70'>Market needs more confluence for a high-probability trade</p>
      </CardContent>
    </Card>
  )

  const isLong = bt.direction === 'LONG'
  const accentGreen = 'text-emerald-600 dark:text-emerald-400'
  const accentRed = 'text-rose-600 dark:text-rose-400'
  const dirColor = isLong ? accentGreen : accentRed
  const bgAccent = isLong
    ? 'from-emerald-50/60 to-background dark:from-emerald-950/20'
    : 'from-rose-50/60 to-background dark:from-rose-950/20'
  const borderAccent = isLong
    ? 'border-emerald-200 dark:border-emerald-800/60'
    : 'border-rose-200 dark:border-rose-800/60'

  const pnlPct = ltp > 0 ? ((bt.tp - bt.entry) / bt.entry * 100) : 0
  const slPct  = ltp > 0 ? ((bt.entry - bt.sl) / bt.entry * 100) : 0

  const regimeColor = bt.regime === 'trending' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/50'
    : bt.regime === 'squeeze' ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50'
    : 'text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800/50'

  return (
    <Card className={`border shadow-md bg-gradient-to-br ${bgAccent} ${borderAccent}`}>
      <CardContent className='p-5 space-y-4'>

        {/* Header row */}
        <div className='flex items-start justify-between gap-3'>
          <div className='flex items-center gap-2.5'>
            <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${
              isLong ? 'bg-emerald-100 dark:bg-emerald-950/60' : 'bg-rose-100 dark:bg-rose-950/60'
            }`}>
              {isLong
                ? <ArrowUpRight className='h-5 w-5 text-emerald-600 dark:text-emerald-400' />
                : <ArrowDownRight className='h-5 w-5 text-rose-600 dark:text-rose-400' />}
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <span className={`text-lg font-bold ${dirColor}`}>{bt.direction}</span>
                <span className='text-sm font-medium text-muted-foreground'>— {bt.strategy}</span>
              </div>
              <div className='flex items-center gap-1.5 mt-0.5'>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${regimeColor}`}>
                  {bt.regime.toUpperCase()}
                </span>
                {bt.trend_alignment && (
                  <span className='text-[10px] font-semibold px-1.5 py-0.5 rounded border text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/50'>
                    TREND ALIGNED
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quality score ring */}
          <div className='flex flex-col items-center'>
            <div className={`w-14 h-14 rounded-full border-4 flex items-center justify-center font-bold text-base ${
              bt.quality_score >= 70
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : bt.quality_score >= 50
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-zinc-400 text-muted-foreground'
            }`}>
              {bt.quality_score}
            </div>
            <span className='text-[10px] text-muted-foreground mt-0.5'>Quality</span>
          </div>
        </div>

        {/* Entry / SL / TP */}
        <div className='grid grid-cols-3 gap-2.5'>
          <div className='rounded-xl border border-border/60 bg-background/80 p-3 text-center'>
            <div className='text-[10px] text-muted-foreground flex items-center justify-center gap-1 mb-1'>
              <Target className='h-3 w-3' /> ENTRY
            </div>
            <div className='text-base font-bold tabular-nums'>{fmtCurrency(bt.entry)}</div>
            {ltp > 0 && <div className='text-[10px] text-muted-foreground mt-0.5'>{fmtPct((bt.entry - ltp) / ltp * 100)} from LTP</div>}
          </div>
          <div className='rounded-xl border border-rose-200/60 dark:border-rose-800/40 bg-rose-50/40 dark:bg-rose-950/10 p-3 text-center'>
            <div className='text-[10px] text-muted-foreground flex items-center justify-center gap-1 mb-1'>
              <Shield className='h-3 w-3' /> STOP LOSS
            </div>
            <div className={`text-base font-bold tabular-nums ${accentRed}`}>{fmtCurrency(bt.sl)}</div>
            <div className='text-[10px] text-rose-500/80 mt-0.5'>Risk {fmtPct(slPct)}</div>
          </div>
          <div className='rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/10 p-3 text-center'>
            <div className='text-[10px] text-muted-foreground flex items-center justify-center gap-1 mb-1'>
              <Zap className='h-3 w-3' /> TARGET
            </div>
            <div className={`text-base font-bold tabular-nums ${accentGreen}`}>{fmtCurrency(bt.tp)}</div>
            <div className='text-[10px] text-emerald-500/80 mt-0.5'>+{fmtPct(Math.abs(pnlPct))}</div>
          </div>
        </div>

        {/* R:R + Confluence strip */}
        <div className='flex items-center justify-between rounded-xl border border-border/40 bg-background/60 px-4 py-2.5'>
          <div className='text-center'>
            <div className='text-[10px] text-muted-foreground mb-0.5'>R : R</div>
            <div className='text-sm font-bold'>1 : {bt.rr.toFixed(1)}</div>
          </div>
          <div className='w-px h-8 bg-border/60' />
          <div className='text-center'>
            <div className='text-[10px] text-muted-foreground mb-0.5'>Confluence</div>
            <div className='flex gap-1 justify-center'>
              {[1,2,3,4].map(i => (
                <div key={i} className={`w-3 h-3 rounded-sm ${i <= bt.confluence
                  ? isLong ? 'bg-emerald-500' : 'bg-rose-500'
                  : 'bg-muted'}`} />
              ))}
            </div>
          </div>
          <div className='w-px h-8 bg-border/60' />
          <div className='text-center'>
            <div className='text-[10px] text-muted-foreground mb-0.5'>Risk ₹</div>
            <div className='text-sm font-bold'>{fmtCurrency(bt.risk_amount)}</div>
          </div>
          <div className='w-px h-8 bg-border/60' />
          <div className='text-center'>
            <div className='text-[10px] text-muted-foreground mb-0.5'>Reward ₹</div>
            <div className='text-sm font-bold text-emerald-600 dark:text-emerald-400'>{fmtCurrency(bt.reward_amount)}</div>
          </div>
        </div>

        {/* Reasoning */}
        <div className='rounded-xl border border-border/40 bg-muted/30 p-3'>
          <p className='text-xs text-muted-foreground leading-relaxed'>{bt.reason}</p>
        </div>

        {/* Supporting factors */}
        {bt.supporting_factors.length > 0 && (
          <div className='space-y-1.5'>
            <p className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wide'>Confluence Factors</p>
            {bt.supporting_factors.map((f, i) => (
              <div key={i} className='flex items-start gap-1.5 text-xs text-muted-foreground'>
                <CheckCircle2 className={`h-3 w-3 mt-0.5 shrink-0 ${isLong ? 'text-emerald-500' : 'text-rose-500'}`} />
                <span>{f}</span>
              </div>
            ))}
          </div>
        )}

        {/* Nearest S/R */}
        {(bt.nearest_support || bt.nearest_resistance) && (
          <div className='grid grid-cols-2 gap-2'>
            {bt.nearest_support && (
              <div className='rounded-lg border border-emerald-200/50 dark:border-emerald-800/30 bg-emerald-50/30 dark:bg-emerald-950/10 px-3 py-1.5'>
                <div className='text-[10px] text-muted-foreground'>Nearest Support</div>
                <div className='text-sm font-bold text-emerald-600 dark:text-emerald-400'>{fmtCurrency(bt.nearest_support)}</div>
              </div>
            )}
            {bt.nearest_resistance && (
              <div className='rounded-lg border border-rose-200/50 dark:border-rose-800/30 bg-rose-50/30 dark:bg-rose-950/10 px-3 py-1.5'>
                <div className='text-[10px] text-muted-foreground'>Nearest Resistance</div>
                <div className='text-sm font-bold text-rose-600 dark:text-rose-400'>{fmtCurrency(bt.nearest_resistance)}</div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Signal card ───────────────────────────────────────────────────────────────

function SignalCard({ signal, rank }: { signal: TradeSignal; rank: number }) {
  const isLong = signal.direction === 'LONG'
  return (
    <div className={`rounded-xl border p-3 space-y-2 ${
      isLong
        ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-800/60 dark:bg-emerald-950/20'
        : 'border-rose-200 bg-rose-50/40 dark:border-rose-800/60 dark:bg-rose-950/20'
    }`}>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-1.5 min-w-0'>
          <span className='text-[10px] font-bold text-muted-foreground/60 shrink-0'>#{rank}</span>
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
              <div key={i} className={`w-1.5 h-1.5 rounded-full ${
                i <= signal.confluence
                  ? isLong ? 'bg-emerald-500' : 'bg-rose-500'
                  : 'bg-muted'
              }`} />
            ))}
          </div>
          <Badge variant='outline' className={`text-[10px] h-4 px-1 ${
            signal.strength === 'High'
              ? 'border-amber-400 text-amber-600 dark:text-amber-400'
              : 'border-slate-300 text-slate-500'
          }`}>
            {signal.strength}
          </Badge>
        </div>
      </div>
      <p className='text-[11px] text-muted-foreground leading-relaxed'>{signal.reason}</p>
      <div className='grid grid-cols-3 gap-1.5'>
        <div className='rounded-lg bg-background/80 p-1.5 text-center border border-border/40'>
          <div className='text-[9px] text-muted-foreground mb-0.5 flex items-center justify-center gap-0.5'><Target className='h-2.5 w-2.5' />Entry</div>
          <div className='text-xs font-bold'>{fmtCurrency(signal.entry)}</div>
        </div>
        <div className='rounded-lg bg-background/80 p-1.5 text-center border border-rose-200/40'>
          <div className='text-[9px] text-muted-foreground mb-0.5 flex items-center justify-center gap-0.5'><Shield className='h-2.5 w-2.5' />SL</div>
          <div className='text-xs font-bold text-rose-600 dark:text-rose-400'>{fmtCurrency(signal.sl)}</div>
        </div>
        <div className='rounded-lg bg-background/80 p-1.5 text-center border border-emerald-200/40'>
          <div className='text-[9px] text-muted-foreground mb-0.5 flex items-center justify-center gap-0.5'><Zap className='h-2.5 w-2.5' />TP</div>
          <div className='text-xs font-bold text-emerald-600 dark:text-emerald-400'>{fmtCurrency(signal.tp)}</div>
        </div>
      </div>
      <div className='text-[10px] text-muted-foreground flex items-center justify-between'>
        <span>R:R = <span className='font-semibold text-foreground'>1:{(signal.rr ?? 0).toFixed(1)}</span></span>
        <span>Confluence {signal.confluence}/4</span>
      </div>
    </div>
  )
}

// ── IndRow ────────────────────────────────────────────────────────────────────

function IndRow({ label, value, sub, color, info }: { label: string; value: string; sub?: string; color?: string; info?: string }) {
  return (
    <div className='flex items-center justify-between py-1.5 border-b border-border/30 last:border-0'>
      <div className='flex items-center gap-1'>
        <span className='text-xs text-muted-foreground'>{label}</span>
        {info && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className='h-3 w-3 text-muted-foreground/50 cursor-help' />
            </TooltipTrigger>
            <TooltipContent><p className='text-xs max-w-48'>{info}</p></TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className='text-right'>
        <span className={`text-xs font-semibold font-mono ${color ?? 'text-foreground'}`}>{value}</span>
        {sub && <span className='text-[10px] text-muted-foreground ml-1'>{sub}</span>}
      </div>
    </div>
  )
}

// ── Candlestick chart with full overlay support ───────────────────────────────

interface ChartProps {
  candles: [number, number, number, number, number, number][]
  ltp: number
  interval: number
  analysis?: Analysis
  showOverlays: boolean
}

function AnalysisChart({ candles, ltp, interval, analysis, showOverlays }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<any>(null)
  const seriesRef    = useRef<any>(null)
  const overlayRefs  = useRef<any[]>([])
  const priceLineRefs = useRef<any[]>([])
  const liveCandleRef = useRef<{ time: number; open: number; high: number; low: number; close: number } | null>(null)
  const IST_OFFSET = 5.5 * 60 * 60

  useEffect(() => {
    if (!containerRef.current) return
    const isDark = document.documentElement.classList.contains('dark')

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#0a0a0d' : '#ffffff' },
        textColor: isDark ? '#71717a' : '#52525b',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: isDark ? '#18181b' : '#f4f4f5' },
        horzLines: { color: isDark ? '#18181b' : '#f4f4f5' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: isDark ? '#27272a' : '#e4e4e7',
        scaleMargins: { top: 0.08, bottom: 0.08 },
      },
      timeScale: {
        borderColor: isDark ? '#27272a' : '#e4e4e7',
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 8,
      },
      width: containerRef.current.clientWidth,
      height: 480,
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
    const ro = new ResizeObserver(resize)
    ro.observe(containerRef.current)
    return () => { ro.disconnect(); chart.remove(); liveCandleRef.current = null }
  }, [])

  // Load candle data
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

  // Live tick
  useEffect(() => {
    if (!seriesRef.current || !ltp || !candles.length) return
    const nowEpoch    = Math.floor(Date.now() / 1000)
    const periodStart = candlePeriodStart(nowEpoch, interval)
    const chartTime   = (periodStart + IST_OFFSET) as any
    const prev = liveCandleRef.current
    if (!prev || chartTime > prev.time) {
      const c = { time: chartTime, open: ltp, high: ltp, low: ltp, close: ltp }
      liveCandleRef.current = c
      seriesRef.current.update(c)
    } else {
      const c = { time: prev.time, open: prev.open, high: Math.max(prev.high, ltp), low: Math.min(prev.low, ltp), close: ltp }
      liveCandleRef.current = c
      seriesRef.current.update(c)
    }
  }, [ltp])

  // Price lines (S/R, signals, FVG, OB) redrawn on analysis change
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return

    // Remove old price lines
    priceLineRefs.current.forEach(l => { try { seriesRef.current.removePriceLine(l) } catch {} })
    priceLineRefs.current = []

    // Remove old overlay series
    overlayRefs.current.forEach(s => { try { chartRef.current.removeSeries(s) } catch {} })
    overlayRefs.current = []

    if (!showOverlays || !analysis) return

    const add = (price: number, color: string, title: string, style = 0, width = 1) => {
      try {
        const l = seriesRef.current.createPriceLine({ price, color, lineWidth: width, lineStyle: style, axisLabelVisible: true, title })
        priceLineRefs.current.push(l)
      } catch {}
    }

    // S/R levels — dashed lines
    analysis.sr_levels?.forEach(lvl => {
      const isAbove = ltp > 0 && lvl > ltp
      add(lvl, isAbove ? 'rgba(244,63,94,0.5)' : 'rgba(16,185,129,0.5)', '', LineStyle.Dashed, 1)
    })

    // FVG zones — horizontal band markers
    analysis.fvgs?.forEach(fvg => {
      const isBull = fvg.type === 'bullish'
      add(fvg.top,    isBull ? 'rgba(16,185,129,0.35)' : 'rgba(244,63,94,0.35)', `FVG ${isBull ? '▲' : '▼'}`, LineStyle.SparseDotted, 1)
      add(fvg.bottom, isBull ? 'rgba(16,185,129,0.35)' : 'rgba(244,63,94,0.35)', '', LineStyle.SparseDotted, 1)
    })

    // Order Block zones
    analysis.order_blocks?.forEach(ob => {
      const isBull = ob.type === 'bullish'
      add(ob.top,    isBull ? 'rgba(99,102,241,0.5)' : 'rgba(249,115,22,0.5)', `OB ${isBull ? '▲' : '▼'}`, LineStyle.Dashed, 1)
      add(ob.bottom, isBull ? 'rgba(99,102,241,0.3)' : 'rgba(249,115,22,0.3)', '', LineStyle.SparseDotted, 1)
    })

    // Best trade lines — prominent
    const bt = analysis.best_trade
    if (bt) {
      const isLong = bt.direction === 'LONG'
      add(bt.entry, isLong ? '#6366f1' : '#f97316', '★ Entry', LineStyle.Solid, 2)
      add(bt.sl,    '#f43f5e', '★ SL',    LineStyle.Dashed, 1)
      add(bt.tp,    '#10b981', '★ TP',    LineStyle.Dashed, 1)
    }

    // VWAP line
    if (analysis.indicators?.vwap) {
      add(analysis.indicators.vwap, 'rgba(234,179,8,0.8)', 'VWAP', LineStyle.Solid, 1)
    }
  }, [analysis, showOverlays, ltp])

  return (
    <div className='relative rounded-xl overflow-hidden border border-border/50'>
      {/* Chart legend overlay */}
      <div className='absolute top-2 left-3 z-10 flex items-center gap-3 text-[10px] text-muted-foreground pointer-events-none'>
        <span className='flex items-center gap-1'><span className='w-3 h-0.5 bg-indigo-500 inline-block'></span> Entry</span>
        <span className='flex items-center gap-1'><span className='w-3 h-0.5 border-t border-dashed border-rose-400 inline-block mt-px'></span> SL</span>
        <span className='flex items-center gap-1'><span className='w-3 h-0.5 border-t border-dashed border-emerald-400 inline-block mt-px'></span> TP</span>
        <span className='flex items-center gap-1'><span className='w-3 h-0.5 border-t border-dotted border-indigo-400 inline-block mt-px'></span> OB</span>
        <span className='flex items-center gap-1'><span className='w-3 h-0.5 bg-amber-400 inline-block'></span> VWAP</span>
      </div>
      <div ref={containerRef} />
    </div>
  )
}

// ── Market Structure badge ────────────────────────────────────────────────────

function RegimeBadge({ regime }: { regime?: 'trending' | 'ranging' | 'squeeze' }) {
  if (!regime) return null
  const cfg = {
    trending: { label: '📈 Trending',  cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300' },
    ranging:  { label: '↔ Ranging',   cls: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300' },
    squeeze:  { label: '⚡ Squeeze',   cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' },
  }[regime]
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>
}

// ── Main component ────────────────────────────────────────────────────────────

export function TradingAnalysis() {
  const [symbol, setSymbol]         = useState('NIFTY')
  const [interval, setInterval]     = useState(5)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [showOverlays, setShowOverlays] = useState(true)
  const [lastLtp, setLastLtp]       = useState<number | null>(null)
  const [aiSignal, setAiSignal]     = useState<AISignal | null>(null)
  const [sigFilter, setSigFilter]   = useState<'all' | 'high' | 'long' | 'short' | 'ai'>('all')
  const [marketOpen, setMarketOpen] = useState(isMarketOpen)
  useAuthStore(s => s.auth.accessToken)

  useEffect(() => {
    const id = window.setInterval(() => setMarketOpen(isMarketOpen()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['analysis-signals', symbol, interval],
    queryFn: () => analysisApi.getSignals(symbol, interval),
    refetchInterval: autoRefresh ? 15000 : false,
    retry: 1,
    staleTime: 5000,
  })

  const { data: candlesData } = useQuery({
    queryKey: ['analysis-candles', symbol, interval],
    queryFn: () => analysisApi.getCandles(symbol, interval),
    refetchInterval: autoRefresh ? 60000 : false,
    retry: 1,
    staleTime: 20000,
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
    onSuccess: (res) => setAiSignal(res.ai_signal),
  })

  const handleSymbolChange = useCallback((s: string) => {
    setSymbol(s); setLastLtp(null); setAiSignal(null)
  }, [])

  const errMsg   = (error as any)?.response?.data?.detail ?? 'Failed to fetch data.'
  const analysis = data?.analysis
  const candles  = candlesData?.candles ?? []
  const signals  = analysis?.signals ?? []
  const ind      = analysis?.indicators
  const bt       = analysis?.best_trade ?? null

  const filteredSigs = signals.filter(s => {
    if (sigFilter === 'high')  return s.strength === 'High'
    if (sigFilter === 'long')  return s.direction === 'LONG'
    if (sigFilter === 'short') return s.direction === 'SHORT'
    return true
  })
  const longCount  = signals.filter(s => s.direction === 'LONG').length
  const shortCount = signals.filter(s => s.direction === 'SHORT').length
  const highCount  = signals.filter(s => s.strength === 'High').length

  const abv       = (v?: number | null) => v != null && ltp > v ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
  const rsiColor  = (v?: number | null) => !v ? '' : v > 70 ? 'text-rose-600 dark:text-rose-400' : v < 30 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
  const macdColor = (v?: number | null) => !v ? '' : v > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'

  // Change from open
  const firstCandle = candles[0]
  const dayOpen     = firstCandle ? firstCandle[1] : 0
  const changePct   = dayOpen > 0 && ltp > 0 ? ((ltp - dayOpen) / dayOpen * 100) : 0

  return (
    <>
      <Header>
        <div className='ms-auto flex items-center space-x-4'>
          <Search /><ThemeSwitch /><ConfigDrawer /><ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-col gap-3 pb-6'>

        {/* ── Title + controls ── */}
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-center gap-3'>
            <div>
              <h1 className='text-lg font-bold tracking-tight flex items-center gap-2'>
                Price Action Terminal
                <Layers className='h-4 w-4 text-indigo-500' />
              </h1>
              <p className='text-xs text-muted-foreground'>Institutional-grade analysis · 20 strategies · SMC · ORB · VWAP</p>
            </div>
          </div>
          <div className='flex items-center gap-1.5 flex-wrap'>
            <div className='flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5'>
              {INTERVALS.map(iv => (
                <IvBtn key={iv.value} label={iv.label} active={interval === iv.value} onClick={() => setInterval(iv.value)} />
              ))}
            </div>
            <Button size='sm' variant='outline' className='gap-1 h-7 text-xs px-2'
              onClick={() => setShowOverlays(p => !p)}>
              {showOverlays ? <Eye className='h-3 w-3' /> : <EyeOff className='h-3 w-3' />}
              Overlays
            </Button>
            <Button size='sm' variant={autoRefresh ? 'default' : 'outline'}
              className={`gap-1 h-7 text-xs px-2 ${autoRefresh ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}`}
              onClick={() => setAutoRefresh(p => !p)}>
              <Activity className={`h-3 w-3 ${autoRefresh ? 'animate-pulse' : ''}`} />
              {autoRefresh ? 'Live' : 'Go Live'}
            </Button>
            <Button size='sm' variant='outline' className='gap-1 h-7 text-xs px-2'
              onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* ── Instrument selector ── */}
        <div className='flex flex-wrap gap-1.5'>
          {INSTRUMENTS.map(i => <SymBtn key={i} label={i} active={symbol === i} onClick={() => handleSymbolChange(i)} />)}
        </div>

        {isError && (
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' /><AlertDescription>{errMsg}</AlertDescription>
          </Alert>
        )}

        {/* ── KPI strip ── */}
        <div className='grid grid-cols-2 sm:grid-cols-6 gap-2'>
          {/* LTP */}
          <Card className='border-0 shadow-sm sm:col-span-2 col-span-2'>
            <CardContent className='p-3'>
              <div className='text-xs text-muted-foreground mb-1 flex items-center gap-1.5'>
                {marketOpen ? (
                  <span className='relative flex h-2 w-2'>
                    <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75' />
                    <span className='relative inline-flex rounded-full h-2 w-2 bg-emerald-500' />
                  </span>
                ) : <span className='inline-flex rounded-full h-2 w-2 bg-zinc-400' />}
                {symbol} · {marketOpen ? 'LIVE' : 'CLOSED'}
              </div>
              {isLoading
                ? <Skeleton className='h-8 w-32' />
                : <div className='flex items-end gap-2'>
                    <div className='text-2xl font-bold tabular-nums'>{ltp > 0 ? fmtCurrency(ltp) : '—'}</div>
                    {changePct !== 0 && (
                      <div className={`text-sm font-semibold mb-0.5 flex items-center gap-0.5 ${changePct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {changePct >= 0 ? <ChevronUp className='h-3.5 w-3.5' /> : <ChevronDown className='h-3.5 w-3.5' />}
                        {fmtPct(changePct)}
                      </div>
                    )}
                  </div>}
            </CardContent>
          </Card>

          {[
            { label: 'Trend',    value: ind?.trend ? ind.trend.charAt(0).toUpperCase() + ind.trend.slice(1) : '—',
              color: ind?.trend === 'bullish' ? 'text-emerald-600 dark:text-emerald-400' : ind?.trend === 'bearish' ? 'text-rose-600 dark:text-rose-400' : '',
              icon: ind?.trend === 'bullish' ? <ChevronUp className='h-3.5 w-3.5' /> : ind?.trend === 'bearish' ? <ChevronDown className='h-3.5 w-3.5' /> : null },
            { label: 'High Prob', value: String(highCount), color: 'text-amber-600 dark:text-amber-400', icon: null },
            { label: '▲ Longs',  value: String(longCount),  color: 'text-emerald-600 dark:text-emerald-400', icon: null },
            { label: '▼ Shorts', value: String(shortCount), color: 'text-rose-600 dark:text-rose-400', icon: null },
          ].map(({ label, value, color, icon }) => (
            <Card key={label} className='border-0 shadow-sm'>
              <CardContent className='p-3'>
                <div className='text-xs text-muted-foreground mb-1'>{label}</div>
                {isLoading
                  ? <Skeleton className='h-6 w-12' />
                  : <div className={`text-lg font-bold flex items-center gap-1 ${color}`}>{icon}{value}</div>}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── 2-col: Best Trade (left) + Chart (right fills) ── */}
        <div className='grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-3'>

          {/* Best Trade */}
          <div className='flex flex-col gap-3'>
            <div className='flex items-center justify-between'>
              <h2 className='text-sm font-bold flex items-center gap-1.5'>
                <span className='inline-block w-2 h-2 rounded-full bg-amber-500'></span>
                Best Trade Setup
              </h2>
              {analysis?.regime && <RegimeBadge regime={analysis.regime} />}
            </div>
            <BestTradeCard bt={bt} ltp={ltp} isLoading={isLoading} />
          </div>

          {/* Chart */}
          <div className='flex flex-col gap-2'>
            <div className='flex items-center justify-between px-1'>
              <span className='text-xs font-medium text-muted-foreground'>
                {symbol} · {interval === 1440 ? '1D' : `${interval}m`} · {candles.length} bars
              </span>
              <div className='flex items-center gap-3 text-[10px] text-muted-foreground'>
                {ind?.vol_spike && <span className='text-amber-500 font-semibold'>⚡ Volume Spike</span>}
                {ind?.supertrend_dir === 1 && <span className='text-emerald-500 font-semibold'>▲ Supertrend Bull</span>}
                {ind?.supertrend_dir === -1 && <span className='text-rose-500 font-semibold'>▼ Supertrend Bear</span>}
              </div>
            </div>
            {isLoading
              ? <Skeleton className='h-[480px] w-full rounded-xl' />
              : candles.length > 0
              ? <AnalysisChart candles={candles} ltp={ltp}
                  interval={interval} analysis={analysis} showOverlays={showOverlays} />
              : <div className='h-[480px] flex items-center justify-center rounded-xl border border-border/50 text-sm text-muted-foreground'>
                  No candle data. Refresh to load.
                </div>}
          </div>
        </div>

        {/* ── Bottom 3-col grid ── */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-3 mt-1'>

          {/* Col 1: All Signals */}
          <Card className='border-0 shadow-sm flex flex-col'>
            <CardHeader className='pb-2 pt-3 px-4'>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-sm font-semibold flex items-center gap-1.5'>
                  <BarChart2 className='h-4 w-4 text-indigo-500' />
                  All Signals
                  {signals.length > 0 && (
                    <Badge className='bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] h-4 px-1'>
                      {signals.length}
                    </Badge>
                  )}
                </CardTitle>
              </div>
              <Tabs value={sigFilter} onValueChange={v => setSigFilter(v as any)}>
                <TabsList className='h-6 text-xs mt-1'>
                  <TabsTrigger value='all'   className='text-[10px] h-5 px-2'>All</TabsTrigger>
                  <TabsTrigger value='high'  className='text-[10px] h-5 px-2'>High ({highCount})</TabsTrigger>
                  <TabsTrigger value='long'  className='text-[10px] h-5 px-2'>Long ({longCount})</TabsTrigger>
                  <TabsTrigger value='short' className='text-[10px] h-5 px-2'>Short ({shortCount})</TabsTrigger>
                  <TabsTrigger value='ai'    className='text-[10px] h-5 px-2 flex items-center gap-0.5'>
                    <Sparkles className='h-2.5 w-2.5' />AI
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className='px-4 pb-4 flex-1 overflow-y-auto max-h-[640px]'>
              {sigFilter === 'ai' ? (
                <div className='space-y-3'>
                  {aiMutation.isPending ? (
                    <div className='flex flex-col items-center justify-center py-10'>
                      <Bot className='h-8 w-8 text-muted-foreground/30 mb-2 animate-pulse' />
                      <p className='text-xs text-muted-foreground'>Generating AI signal...</p>
                    </div>
                  ) : aiSignal ? (
                    <div className={`rounded-xl border p-3 space-y-2.5 ${
                      aiSignal.direction === 'LONG'
                        ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-800/60 dark:bg-emerald-950/20'
                        : aiSignal.direction === 'SHORT'
                        ? 'border-rose-200 bg-rose-50/40 dark:border-rose-800/60 dark:bg-rose-950/20'
                        : 'border-zinc-200 bg-zinc-50/40 dark:border-zinc-800/60 dark:bg-zinc-950/20'
                    }`}>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-1.5'>
                          {aiSignal.direction === 'LONG'
                            ? <TrendingUp className='h-3.5 w-3.5 text-emerald-500' />
                            : aiSignal.direction === 'SHORT'
                            ? <TrendingDown className='h-3.5 w-3.5 text-rose-500' />
                            : <CheckCircle2 className='h-3.5 w-3.5 text-zinc-500' />}
                          <span className={`text-xs font-bold ${
                            aiSignal.direction === 'LONG' ? 'text-emerald-600 dark:text-emerald-400'
                            : aiSignal.direction === 'SHORT' ? 'text-rose-600 dark:text-rose-400'
                            : 'text-zinc-600'}`}>
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
                        <>
                          <div className='grid grid-cols-3 gap-1.5'>
                            <div className='rounded-lg bg-background/80 p-1.5 text-center border border-border/40'>
                              <div className='text-[9px] text-muted-foreground mb-0.5'>Entry</div>
                              <div className='text-xs font-bold'>{fmtCurrency(aiSignal.entry)}</div>
                            </div>
                            <div className='rounded-lg bg-background/80 p-1.5 text-center border border-rose-200/40'>
                              <div className='text-[9px] text-muted-foreground mb-0.5'>SL</div>
                              <div className='text-xs font-bold text-rose-600 dark:text-rose-400'>{fmtCurrency(aiSignal.sl)}</div>
                            </div>
                            <div className='rounded-lg bg-background/80 p-1.5 text-center border border-emerald-200/40'>
                              <div className='text-[9px] text-muted-foreground mb-0.5'>TP</div>
                              <div className='text-xs font-bold text-emerald-600 dark:text-emerald-400'>{fmtCurrency(aiSignal.tp)}</div>
                            </div>
                          </div>
                          <div className='text-[10px] text-muted-foreground text-right'>
                            R:R = <span className='font-semibold text-foreground'>1:{aiSignal.rr_ratio.toFixed(1)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className='flex flex-col items-center justify-center py-10 text-center'>
                      <Sparkles className='h-8 w-8 text-muted-foreground/30 mb-2' />
                      <p className='text-sm font-medium text-muted-foreground'>No AI signal yet</p>
                      <p className='text-xs text-muted-foreground mt-1'>Uses Claude to analyse price action holistically</p>
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
                  {filteredSigs.map((s, i) => <SignalCard key={i} signal={s} rank={i + 1} />)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Col 2: Indicators + S&R */}
          <div className='space-y-3'>
            <Card className='border-0 shadow-sm'>
              <CardHeader className='pb-1 pt-3 px-4'>
                <CardTitle className='text-sm font-semibold'>Technical Indicators</CardTitle>
              </CardHeader>
              <CardContent className='px-4 pb-3'>
                {isLoading
                  ? <div className='space-y-1.5'>{[1,2,3,4,5,6,7,8,9].map(i => <Skeleton key={i} className='h-5 w-full' />)}</div>
                  : <div>
                      <IndRow label='EMA 9'   value={ind?.ema9   ? fmtCurrency(ind.ema9)  : '—'} color={abv(ind?.ema9)}  info='9-period Exponential MA — fast trend' />
                      <IndRow label='EMA 21'  value={ind?.ema21  ? fmtCurrency(ind.ema21) : '—'} color={abv(ind?.ema21)} info='21-period EMA — medium trend' />
                      <IndRow label='EMA 50'  value={ind?.ema50  ? fmtCurrency(ind.ema50) : '—'} color={abv(ind?.ema50)} info='50-period EMA — primary trend bias' />
                      <IndRow label='EMA 200' value={ind?.ema200 ? fmtCurrency(ind.ema200): '—'} color={abv(ind?.ema200)} info='200-period EMA — major trend' />
                      <IndRow label='RSI 14'  value={ind?.rsi14?.toFixed(1) ?? '—'} color={rsiColor(ind?.rsi14)} info='RSI: >70 overbought, <30 oversold' />
                      <IndRow label='StochRSI %K' value={ind?.stoch_k?.toFixed(0) ?? '—'} color={rsiColor(ind?.stoch_k)} />
                      <IndRow label='MACD'    value={ind?.macd?.toFixed(1) ?? '—'} sub={`sig ${ind?.macd_signal?.toFixed(1) ?? '—'}`} color={macdColor(ind?.macd)} />
                      <IndRow label='MACD Hist' value={ind?.macd_hist?.toFixed(1) ?? '—'} color={macdColor(ind?.macd_hist)} />
                      <IndRow label='ATR 14'  value={ind?.atr14 ? fmtCurrency(ind.atr14) : '—'} info='Average True Range — volatility measure' />
                      <IndRow label='VWAP'    value={ind?.vwap ? fmtCurrency(ind.vwap) : '—'} color={abv(ind?.vwap)} info='Volume Weighted Average Price — institutional benchmark' />
                      <IndRow label='BB Upper' value={ind?.bb_upper ? fmtCurrency(ind.bb_upper) : '—'} />
                      <IndRow label='BB Lower' value={ind?.bb_lower ? fmtCurrency(ind.bb_lower) : '—'} />
                      <IndRow label='BB %'    value={ind?.bb_pct != null ? `${ind.bb_pct}%` : '—'}
                        color={ind?.bb_pct != null ? ind.bb_pct > 80 ? 'text-rose-600' : ind.bb_pct < 20 ? 'text-emerald-600' : '' : ''}
                        info='BB%: position within Bollinger Bands (0=lower, 100=upper)' />
                      <IndRow label='Supertrend' value={ind?.supertrend ? fmtCurrency(ind.supertrend) : '—'}
                        color={ind?.supertrend_dir === 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}
                        sub={ind?.supertrend_dir === 1 ? '▲ Bull' : ind?.supertrend_dir === -1 ? '▼ Bear' : ''} />
                      {ind?.vol_spike && (
                        <div className='mt-2 text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-2 py-1.5'>
                          ⚡ Volume Spike — Unusual institutional activity
                        </div>
                      )}
                    </div>}
              </CardContent>
            </Card>

            {/* S&R */}
            <Card className='border-0 shadow-sm'>
              <CardHeader className='pb-1 pt-3 px-4'>
                <CardTitle className='text-sm font-semibold'>Support & Resistance</CardTitle>
              </CardHeader>
              <CardContent className='px-4 pb-3'>
                {isLoading
                  ? <div className='space-y-1'>{[1,2,3,4].map(i => <Skeleton key={i} className='h-6 w-full' />)}</div>
                  : !analysis?.sr_levels?.length
                  ? <p className='text-xs text-muted-foreground'>Not enough data</p>
                  : <div className='space-y-1'>
                      {[...analysis.sr_levels].reverse().slice(0, 12).map((lvl, i) => {
                        const isAbove = lvl > ltp
                        const dist    = ltp > 0 ? ((lvl - ltp) / ltp * 100) : 0
                        const near    = Math.abs(dist) < 0.3
                        return (
                          <div key={i} className={`flex items-center justify-between rounded-lg px-2 py-1 text-xs ${
                            near ? 'bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800' : 'bg-muted/30'
                          }`}>
                            <span className={`font-semibold font-mono text-[11px] ${isAbove ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {fmtCurrency(lvl)}
                            </span>
                            <span className='text-[10px] text-muted-foreground'>
                              {isAbove ? '▲' : '▼'} {Math.abs(dist).toFixed(2)}%{near ? ' ⚡' : ''}
                            </span>
                          </div>
                        )
                      })}
                    </div>}
              </CardContent>
            </Card>
          </div>

          {/* Col 3: Patterns + Smart Money */}
          <div className='space-y-3'>
            {/* Candlestick Patterns */}
            <Card className='border-0 shadow-sm'>
              <CardHeader className='pb-1 pt-3 px-4'>
                <CardTitle className='text-sm font-semibold'>Candlestick Patterns</CardTitle>
              </CardHeader>
              <CardContent className='px-4 pb-3'>
                {isLoading
                  ? <div className='space-y-1'>{[1,2].map(i => <Skeleton key={i} className='h-8 w-full rounded-lg' />)}</div>
                  : !analysis?.patterns?.length
                  ? <p className='text-xs text-muted-foreground'>No patterns on last 2 candles</p>
                  : <div className='space-y-1.5'>
                      {analysis.patterns.map((p, i) => (
                        <div key={i} className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs border ${
                          p.direction === 'LONG'
                            ? 'bg-emerald-50/60 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/50'
                            : p.direction === 'SHORT'
                            ? 'bg-rose-50/60 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800/50'
                            : 'bg-muted/40 border-border/40'
                        }`}>
                          <span className='font-medium'>{p.type}</span>
                          <Badge variant='outline' className={`text-[10px] h-4 px-1 ${
                            p.direction === 'LONG' ? 'border-emerald-400 text-emerald-600'
                            : p.direction === 'SHORT' ? 'border-rose-400 text-rose-600'
                            : 'border-zinc-400 text-zinc-500'}`}>
                            {p.direction}
                          </Badge>
                        </div>
                      ))}
                    </div>}
              </CardContent>
            </Card>

            {/* Smart Money Concepts */}
            <Card className='border-0 shadow-sm'>
              <CardHeader className='pb-1 pt-3 px-4'>
                <CardTitle className='text-sm font-semibold'>Smart Money Concepts</CardTitle>
              </CardHeader>
              <CardContent className='px-4 pb-3 space-y-3'>
                {/* FVG */}
                <div>
                  <p className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1'>Fair Value Gaps</p>
                  {!analysis?.fvgs?.length
                    ? <p className='text-xs text-muted-foreground'>None detected</p>
                    : <div className='space-y-1'>
                        {analysis.fvgs.map((fvg, i) => (
                          <div key={i} className={`flex items-center justify-between rounded px-2 py-1 text-xs ${
                            fvg.type === 'bullish' ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : 'bg-rose-50/60 dark:bg-rose-950/20'
                          }`}>
                            <span className={`font-medium capitalize ${fvg.type === 'bullish' ? 'text-emerald-600' : 'text-rose-600'}`}>{fvg.type}</span>
                            <span className='font-mono text-[10px] text-muted-foreground'>{fmtCurrency(fvg.bottom)}–{fmtCurrency(fvg.top)}</span>
                            {ltp > 0 && ltp >= fvg.bottom && ltp <= fvg.top && (
                              <span className='text-amber-500 text-[10px] font-bold'>⚡ IN</span>
                            )}
                          </div>
                        ))}
                      </div>}
                </div>

                {/* Order Blocks */}
                <div>
                  <p className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1'>Order Blocks</p>
                  {!analysis?.order_blocks?.length
                    ? <p className='text-xs text-muted-foreground'>None detected</p>
                    : <div className='space-y-1'>
                        {analysis.order_blocks.slice(-5).map((ob, i) => (
                          <div key={i} className={`flex items-center justify-between rounded px-2 py-1 text-xs ${
                            ob.type === 'bullish' ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : 'bg-rose-50/60 dark:bg-rose-950/20'
                          }`}>
                            <span className={`font-medium capitalize ${ob.type === 'bullish' ? 'text-emerald-600' : 'text-rose-600'}`}>{ob.type} OB</span>
                            <span className='font-mono text-[10px] text-muted-foreground'>{fmtCurrency(ob.bottom)}–{fmtCurrency(ob.top)}</span>
                            {ltp > 0 && ltp >= ob.bottom && ltp <= ob.top && (
                              <span className='text-amber-500 text-[10px] font-bold'>⚡ IN</span>
                            )}
                          </div>
                        ))}
                      </div>}
                </div>

                {/* BOS / ChoCh */}
                <div>
                  <p className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1'>Market Structure</p>
                  {!analysis?.bos_choch?.length
                    ? <p className='text-xs text-muted-foreground'>No recent BOS / ChoCh</p>
                    : <div className='space-y-1'>
                        {analysis.bos_choch.map((b, i) => (
                          <div key={i} className={`flex items-center justify-between rounded px-2 py-1 text-xs ${
                            b.direction === 'LONG' ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : 'bg-rose-50/60 dark:bg-rose-950/20'
                          }`}>
                            <span className={`font-bold ${b.direction === 'LONG' ? 'text-emerald-600' : 'text-rose-600'}`}>{b.type}</span>
                            <span className='font-mono text-[10px] text-muted-foreground'>@ {fmtCurrency(b.level)}</span>
                            <Badge variant='outline' className={`text-[10px] h-4 px-1 ${
                              b.direction === 'LONG' ? 'border-emerald-400 text-emerald-600' : 'border-rose-400 text-rose-600'
                            }`}>{b.direction}</Badge>
                          </div>
                        ))}
                      </div>}
                </div>

                {/* Liquidity Sweeps */}
                {(analysis?.liquidity_sweeps?.length ?? 0) > 0 && (
                  <div>
                    <p className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1'>Liquidity Sweeps</p>
                    <div className='space-y-1'>
                      {analysis!.liquidity_sweeps.map((sw, i) => (
                        <div key={i} className={`flex items-center justify-between rounded px-2 py-1 text-xs ${
                          sw.type === 'bullish_sweep' ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : 'bg-rose-50/60 dark:bg-rose-950/20'
                        }`}>
                          <span className={`font-medium ${sw.type === 'bullish_sweep' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {sw.type === 'bullish_sweep' ? '▲ Bull' : '▼ Bear'} Sweep
                          </span>
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
      </Main>
    </>
  )
}
