import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Zap, Layers, BarChart2,
  ChevronDown, ChevronUp, Calendar,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { snapshotsApi, type DailyPnlRow, type HoldingPnlRow } from '@/lib/snapshots-api'

// ── formatters ──────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(v)

const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })

const pnlCls = (v: number) =>
  v >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'

const yFmt = (v: number) => {
  const n = Number(v)
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (Math.abs(n) >= 1000)   return `₹${(n / 1000).toFixed(0)}k`
  return `₹${n}`
}

// ── sub-components ──────────────────────────────────────────────────────────

function PnlBadge({ value }: { value: number }) {
  const pos = value >= 0
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold font-mono tabular-nums ${
      pos ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
          : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
    }`}>
      {pos ? <TrendingUp className='h-3 w-3' /> : <TrendingDown className='h-3 w-3' />}
      {fmt(Math.abs(value))}
    </span>
  )
}

function StatChip({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className='flex flex-col'>
      <span className='text-[11px] text-muted-foreground'>{label}</span>
      <span className='text-sm font-bold tabular-nums'>{value}</span>
      {sub && <span className='text-[10px] text-muted-foreground'>{sub}</span>}
    </div>
  )
}

// ── Intraday Tab ─────────────────────────────────────────────────────────────

function IntradayTab({ daily }: { daily: DailyPnlRow[] }) {
  const [openRow, setOpenRow] = useState<string | null>(null)

  const totalIntraday = daily.reduce((s, d) => s + (d.intraday_pnl || 0), 0)
  const totalFno      = daily.reduce((s, d) => s + (d.fno_pnl || 0), 0)
  const totalDay      = totalIntraday + totalFno
  const profitDays    = daily.filter(d => (d.intraday_pnl || 0) + (d.fno_pnl || 0) > 0).length
  const lossDays      = daily.filter(d => (d.intraday_pnl || 0) + (d.fno_pnl || 0) < 0).length

  const chartData = daily.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    intraday: Number(d.intraday_pnl) || 0,
    fno:      Number(d.fno_pnl) || 0,
  }))

  return (
    <div className='space-y-4'>
      {/* Summary strip */}
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
        <Card className='border-0 shadow-sm'>
          <CardContent className='p-3'>
            <p className='text-[11px] text-muted-foreground mb-1'>Total Trading P&L</p>
            <p className={`text-lg font-bold tabular-nums ${pnlCls(totalDay)}`}>{fmt(totalDay)}</p>
            <p className='text-[10px] text-muted-foreground mt-0.5'>{daily.length} trading days</p>
          </CardContent>
        </Card>
        <Card className='border-0 shadow-sm'>
          <CardContent className='p-3'>
            <p className='text-[11px] text-muted-foreground mb-1'>Intraday P&L</p>
            <p className={`text-lg font-bold tabular-nums ${pnlCls(totalIntraday)}`}>{fmt(totalIntraday)}</p>
            <p className='text-[10px] text-muted-foreground mt-0.5'>Equity trades</p>
          </CardContent>
        </Card>
        <Card className='border-0 shadow-sm'>
          <CardContent className='p-3'>
            <p className='text-[11px] text-muted-foreground mb-1'>F&O P&L</p>
            <p className={`text-lg font-bold tabular-nums ${pnlCls(totalFno)}`}>{fmt(totalFno)}</p>
            <p className='text-[10px] text-muted-foreground mt-0.5'>Futures & Options</p>
          </CardContent>
        </Card>
        <Card className='border-0 shadow-sm'>
          <CardContent className='p-3'>
            <p className='text-[11px] text-muted-foreground mb-1'>Win / Loss Days</p>
            <p className='text-lg font-bold tabular-nums'>
              <span className='text-emerald-600 dark:text-emerald-400'>{profitDays}</span>
              <span className='text-muted-foreground mx-1'>/</span>
              <span className='text-rose-600 dark:text-rose-400'>{lossDays}</span>
            </p>
            <p className='text-[10px] text-muted-foreground mt-0.5'>{daily.length - profitDays - lossDays} flat</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className='border-0 shadow-sm'>
          <CardHeader className='py-3 px-4'>
            <CardTitle className='text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5'>
              <Zap className='h-3.5 w-3.5 text-amber-500' /> Daily Trading P&L
              <span className='ml-auto normal-case font-normal text-[10px]'>
                <span className='inline-flex items-center gap-1 mr-3'><span className='h-2 w-2 rounded-sm inline-block bg-emerald-500' /> Intraday</span>
                <span className='inline-flex items-center gap-1'><span className='h-2 w-2 rounded-sm inline-block bg-amber-500' /> F&O</span>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className='px-2 pb-3 pt-0'>
            <ResponsiveContainer width='100%' height={180}>
              <BarChart data={chartData} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' vertical={false} />
                <XAxis dataKey='date' tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={56} tickFormatter={yFmt} />
                <Tooltip
                  formatter={(val, name) => [fmt(Number(val)), String(name) === 'intraday' ? 'Intraday' : 'F&O']}
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                />
                <Bar dataKey='intraday' radius={[3, 3, 0, 0]} maxBarSize={28} minPointSize={2}>
                  {chartData.map((e, i) => <Cell key={i} fill={e.intraday >= 0 ? '#10b981' : '#f43f5e'} fillOpacity={0.9} />)}
                </Bar>
                <Bar dataKey='fno' radius={[3, 3, 0, 0]} maxBarSize={28} minPointSize={2}>
                  {chartData.map((e, i) => <Cell key={i} fill={e.fno >= 0 ? '#f59e0b' : '#ef4444'} fillOpacity={0.9} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Daily table with expandable positions */}
      <Card className='border-0 shadow-sm'>
        <CardHeader className='py-3 px-4'>
          <CardTitle className='text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5'>
            <Calendar className='h-3.5 w-3.5 text-indigo-500' /> Daily Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          <Table>
            <TableHeader>
              <TableRow className='hover:bg-transparent'>
                <TableHead className='pl-4 h-8 text-xs w-6' />
                <TableHead className='h-8 text-xs'>Date</TableHead>
                <TableHead className='text-right h-8 text-xs'>Intraday P&L</TableHead>
                <TableHead className='text-right h-8 text-xs'>F&O P&L</TableHead>
                <TableHead className='text-right h-8 text-xs'>Day Total</TableHead>
                <TableHead className='text-right h-8 text-xs'>Equity P&L</TableHead>
                <TableHead className='text-right pr-4 h-8 text-xs'>Trades</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...daily].reverse().map((row) => {
                const isOpen = openRow === row.date
                const dayTotal = (row.intraday_pnl || 0) + (row.fno_pnl || 0)
                const hasPositions = row.positions && row.positions.length > 0
                return (
                  <>
                    <TableRow
                      key={row.date}
                      className={`hover:bg-muted/30 ${hasPositions ? 'cursor-pointer' : ''}`}
                      onClick={() => hasPositions && setOpenRow(isOpen ? null : row.date)}
                    >
                      <TableCell className='pl-4 py-2 w-6'>
                        {hasPositions && (
                          isOpen
                            ? <ChevronUp className='h-3.5 w-3.5 text-muted-foreground' />
                            : <ChevronDown className='h-3.5 w-3.5 text-muted-foreground' />
                        )}
                      </TableCell>
                      <TableCell className='py-2 text-xs font-medium'>{fmtDate(row.date)}</TableCell>
                      <TableCell className='text-right py-2'>
                        <span className={`text-xs font-mono tabular-nums ${pnlCls(row.intraday_pnl || 0)}`}>
                          {fmt(row.intraday_pnl || 0)}
                        </span>
                      </TableCell>
                      <TableCell className='text-right py-2'>
                        <span className={`text-xs font-mono tabular-nums ${pnlCls(row.fno_pnl || 0)}`}>
                          {fmt(row.fno_pnl || 0)}
                        </span>
                      </TableCell>
                      <TableCell className='text-right py-2'><PnlBadge value={dayTotal} /></TableCell>
                      <TableCell className='text-right py-2'>
                        <span className={`text-xs font-mono tabular-nums ${pnlCls(row.equity_pnl || 0)}`}>
                          {fmt(row.equity_pnl || 0)}
                          <span className='text-muted-foreground ml-1 text-[10px]'>({fmtPct(row.equity_pnl_pct || 0)})</span>
                        </span>
                      </TableCell>
                      <TableCell className='text-right pr-4 py-2'>
                        {(row.intraday_trades + row.fno_trades) > 0 ? (
                          <span className='text-xs text-muted-foreground'>
                            {row.intraday_trades > 0 && <span className='mr-1'>{row.intraday_trades} EQ</span>}
                            {row.fno_trades > 0 && <span>{row.fno_trades} F&O</span>}
                          </span>
                        ) : <span className='text-xs text-muted-foreground'>—</span>}
                      </TableCell>
                    </TableRow>
                    {isOpen && row.positions.length > 0 && (
                      <TableRow key={`${row.date}-pos`} className='bg-muted/20 hover:bg-muted/20'>
                        <TableCell colSpan={7} className='px-4 py-0 pb-3'>
                          <div className='mt-2 rounded-lg border bg-card overflow-hidden'>
                            <Table>
                              <TableHeader>
                                <TableRow className='hover:bg-transparent bg-muted/40'>
                                  <TableHead className='pl-3 h-7 text-[11px]'>Symbol</TableHead>
                                  <TableHead className='h-7 text-[11px]'>Segment</TableHead>
                                  <TableHead className='text-right h-7 text-[11px]'>Qty</TableHead>
                                  <TableHead className='text-right h-7 text-[11px]'>Realised</TableHead>
                                  <TableHead className='text-right h-7 text-[11px]'>Unrealised</TableHead>
                                  <TableHead className='text-right pr-3 h-7 text-[11px]'>Total P&L</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {row.positions.map((p, i) => (
                                  <TableRow key={i} className='hover:bg-muted/30'>
                                    <TableCell className='pl-3 py-1.5 text-xs font-semibold truncate max-w-[160px]'>{p.symbol}</TableCell>
                                    <TableCell className='py-1.5'>
                                      <Badge variant='outline' className={`text-[10px] px-1.5 py-0 h-4 ${
                                        p.segment === 'FNO'
                                          ? 'border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950 dark:text-amber-300'
                                          : 'border-sky-300 text-sky-700 bg-sky-50 dark:bg-sky-950 dark:text-sky-300'
                                      }`}>{p.segment}</Badge>
                                    </TableCell>
                                    <TableCell className='text-right py-1.5 text-xs text-muted-foreground'>{p.quantity}</TableCell>
                                    <TableCell className={`text-right py-1.5 text-xs font-mono tabular-nums ${pnlCls(p.realised_pnl)}`}>
                                      {fmt(p.realised_pnl)}
                                    </TableCell>
                                    <TableCell className={`text-right py-1.5 text-xs font-mono tabular-nums ${pnlCls(p.unrealised_pnl)}`}>
                                      {fmt(p.unrealised_pnl)}
                                    </TableCell>
                                    <TableCell className='text-right pr-3 py-1.5'><PnlBadge value={p.pnl} /></TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Holdings Tab ──────────────────────────────────────────────────────────────

function HoldingsTab({ holdings }: { holdings: HoldingPnlRow[] }) {
  const [selected, setSelected] = useState<string | null>(
    holdings.length > 0 ? holdings[0].symbol : null
  )

  const totalInvested     = holdings.reduce((s, h) => s + h.invested, 0)
  const totalCurrentValue = holdings.reduce((s, h) => s + h.current_value, 0)
  const totalPnl          = holdings.reduce((s, h) => s + h.pnl, 0)
  const totalPnlPct       = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0

  const sorted = [...holdings].sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
  const sel = holdings.find(h => h.symbol === selected)

  const chartData = sel?.history.map(p => ({
    date: new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    pnl:  Number(p.pnl) || 0,
    ltp:  Number(p.ltp) || 0,
  })) ?? []

  return (
    <div className='space-y-4'>
      {/* Summary strip */}
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
        <Card className='border-0 shadow-sm'>
          <CardContent className='p-3'>
            <p className='text-[11px] text-muted-foreground mb-1'>Total Invested</p>
            <p className='text-lg font-bold tabular-nums text-indigo-600 dark:text-indigo-400'>{fmt(totalInvested)}</p>
            <p className='text-[10px] text-muted-foreground mt-0.5'>{holdings.length} holdings</p>
          </CardContent>
        </Card>
        <Card className='border-0 shadow-sm'>
          <CardContent className='p-3'>
            <p className='text-[11px] text-muted-foreground mb-1'>Current Value</p>
            <p className='text-lg font-bold tabular-nums text-indigo-600 dark:text-indigo-400'>{fmt(totalCurrentValue)}</p>
            <p className='text-[10px] text-muted-foreground mt-0.5'>{totalCurrentValue > totalInvested ? '↑ Appreciation' : '↓ Depreciation'}</p>
          </CardContent>
        </Card>
        <Card className='border-0 shadow-sm'>
          <CardContent className='p-3'>
            <p className='text-[11px] text-muted-foreground mb-1'>Unrealised P&L</p>
            <p className={`text-lg font-bold tabular-nums ${pnlCls(totalPnl)}`}>{fmt(totalPnl)}</p>
            <p className='text-[10px] text-muted-foreground mt-0.5'>{fmtPct(totalPnlPct)}</p>
          </CardContent>
        </Card>
        <Card className='border-0 shadow-sm'>
          <CardContent className='p-3'>
            <p className='text-[11px] text-muted-foreground mb-1'>Best / Worst</p>
            {holdings.length > 0 ? (() => {
              const best  = holdings.reduce((a, b) => a.pnl_pct > b.pnl_pct ? a : b)
              const worst = holdings.reduce((a, b) => a.pnl_pct < b.pnl_pct ? a : b)
              return (
                <>
                  <p className='text-xs font-semibold text-emerald-600 dark:text-emerald-400 truncate'>{best.symbol} ({fmtPct(best.pnl_pct)})</p>
                  <p className='text-xs font-semibold text-rose-600 dark:text-rose-400 truncate'>{worst.symbol} ({fmtPct(worst.pnl_pct)})</p>
                </>
              )
            })() : <p className='text-xs text-muted-foreground'>—</p>}
          </CardContent>
        </Card>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        {/* Holdings list */}
        <Card className='border-0 shadow-sm lg:col-span-1'>
          <CardHeader className='py-3 px-4'>
            <CardTitle className='text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5'>
              <BarChart2 className='h-3.5 w-3.5 text-indigo-500' /> Holdings
            </CardTitle>
          </CardHeader>
          <CardContent className='p-0'>
            <div className='max-h-[480px] overflow-y-auto'>
              {sorted.map(h => (
                <div
                  key={h.symbol}
                  onClick={() => setSelected(h.symbol)}
                  className={`flex items-center justify-between px-4 py-2.5 cursor-pointer border-b last:border-b-0 hover:bg-muted/30 transition-colors ${
                    selected === h.symbol ? 'bg-indigo-50 dark:bg-indigo-950/40 border-l-2 border-l-indigo-500' : ''
                  }`}
                >
                  <div>
                    <p className='text-xs font-semibold'>{h.symbol}</p>
                    <p className='text-[10px] text-muted-foreground'>{h.quantity} qty · avg {fmt(h.avg_price)}</p>
                  </div>
                  <div className='text-right'>
                    <p className={`text-xs font-bold tabular-nums ${pnlCls(h.pnl)}`}>{fmt(h.pnl)}</p>
                    <p className={`text-[10px] tabular-nums ${pnlCls(h.pnl_pct)}`}>{fmtPct(h.pnl_pct)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Selected holding detail + chart */}
        <div className='lg:col-span-2 space-y-3'>
          {sel ? (
            <>
              {/* Detail card */}
              <Card className='border-0 shadow-sm'>
                <CardContent className='p-4'>
                  <div className='flex items-start justify-between mb-3'>
                    <div>
                      <h3 className='text-base font-bold'>{sel.symbol}</h3>
                      <p className='text-xs text-muted-foreground'>{sel.quantity} shares · Avg ₹{sel.avg_price.toFixed(2)}</p>
                    </div>
                    <PnlBadge value={sel.pnl} />
                  </div>
                  <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
                    <StatChip label='LTP' value={fmt(sel.ltp)} />
                    <StatChip label='Invested' value={fmt(sel.invested)} />
                    <StatChip label='Current Value' value={fmt(sel.current_value)} />
                    <StatChip label='P&L %' value={fmtPct(sel.pnl_pct)}
                      sub={sel.pnl >= 0 ? '↑ gain' : '↓ loss'} />
                  </div>
                </CardContent>
              </Card>

              {/* P&L history chart */}
              {chartData.length > 0 && (
                <Card className='border-0 shadow-sm'>
                  <CardHeader className='py-3 px-4'>
                    <CardTitle className='text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5'>
                      <TrendingUp className='h-3.5 w-3.5 text-indigo-500' /> {sel.symbol} · P&L History
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='px-2 pb-3 pt-0'>
                    <ResponsiveContainer width='100%' height={160}>
                      <BarChart data={chartData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' vertical={false} />
                        <XAxis dataKey='date' tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={56} tickFormatter={yFmt} />
                        <Tooltip formatter={(val) => [fmt(Number(val)), 'P&L']} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                        <Bar dataKey='pnl' radius={[3, 3, 0, 0]} maxBarSize={40} minPointSize={2}>
                          {chartData.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#6366f1' : '#f43f5e'} fillOpacity={0.9} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* History table */}
              {sel.history.length > 0 && (
                <Card className='border-0 shadow-sm'>
                  <CardHeader className='py-3 px-4'>
                    <CardTitle className='text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5'>
                      <Calendar className='h-3.5 w-3.5 text-indigo-500' /> Daily P&L Snapshots
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='p-0'>
                    <div className='max-h-52 overflow-y-auto'>
                      <Table>
                        <TableHeader>
                          <TableRow className='hover:bg-transparent'>
                            <TableHead className='pl-4 h-7 text-xs'>Date</TableHead>
                            <TableHead className='text-right h-7 text-xs'>LTP</TableHead>
                            <TableHead className='text-right h-7 text-xs'>Value</TableHead>
                            <TableHead className='text-right h-7 text-xs'>P&L</TableHead>
                            <TableHead className='text-right pr-4 h-7 text-xs'>P&L %</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...sel.history].reverse().map((h, i) => (
                            <TableRow key={i} className='hover:bg-muted/30'>
                              <TableCell className='pl-4 py-1.5 text-xs'>{fmtDate(h.date)}</TableCell>
                              <TableCell className='text-right py-1.5 text-xs font-mono tabular-nums'>{fmt(h.ltp)}</TableCell>
                              <TableCell className='text-right py-1.5 text-xs font-mono tabular-nums'>{fmt(h.current_value)}</TableCell>
                              <TableCell className={`text-right py-1.5 text-xs font-mono tabular-nums ${pnlCls(h.pnl)}`}>{fmt(h.pnl)}</TableCell>
                              <TableCell className={`text-right pr-4 py-1.5 text-xs tabular-nums ${pnlCls(h.pnl_pct)}`}>{fmtPct(h.pnl_pct)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className='flex h-40 items-center justify-center text-sm text-muted-foreground'>
              Select a holding to view details
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function PnlPage() {
  const reportQ = useQuery({
    queryKey: ['pnl-report'],
    queryFn: () => snapshotsApi.getPnlReport(90),
    staleTime: 0,
    retry: false,
  })

  const daily    = reportQ.data?.daily    ?? []
  const holdings = reportQ.data?.holdings ?? []

  const totalTradingPnl = daily.reduce((s, d) => s + (d.intraday_pnl || 0) + (d.fno_pnl || 0), 0)
  const totalEquityPnl  = holdings.reduce((s, h) => s + h.pnl, 0)
  const grandTotal      = totalTradingPnl + totalEquityPnl

  return (
    <>
      <Header>
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-col gap-4'>
        {/* Page header */}
        <div className='flex items-start justify-between'>
          <div>
            <h1 className='text-xl font-bold tracking-tight'>Profit & Loss</h1>
            <p className='text-xs text-muted-foreground mt-0.5'>Last 90 days · all accounts</p>
          </div>
          {!reportQ.isLoading && (
            <div className='text-right'>
              <p className='text-[11px] text-muted-foreground'>Overall P&L</p>
              <p className={`text-xl font-bold tabular-nums ${pnlCls(grandTotal)}`}>{fmt(grandTotal)}</p>
            </div>
          )}
        </div>

        {reportQ.isLoading ? (
          <div className='space-y-3'>
            <div className='grid grid-cols-4 gap-3'>
              {[...Array(4)].map((_, i) => <Skeleton key={i} className='h-20 w-full rounded-lg' />)}
            </div>
            <Skeleton className='h-52 w-full rounded-lg' />
            <Skeleton className='h-64 w-full rounded-lg' />
          </div>
        ) : reportQ.isError ? (
          <div className='flex h-40 items-center justify-center text-sm text-rose-500'>
            Failed to load P&L data. Check your broker token in Settings.
          </div>
        ) : daily.length === 0 && holdings.length === 0 ? (
          <div className='flex h-40 items-center justify-center text-sm text-muted-foreground'>
            No data yet — capture a snapshot from the Dashboard first.
          </div>
        ) : (
          <Tabs defaultValue='intraday' className='space-y-4'>
            <TabsList className='h-9'>
              <TabsTrigger value='intraday' className='gap-1.5 text-xs'>
                <Zap className='h-3.5 w-3.5' /> Intraday & F&O
                {totalTradingPnl !== 0 && (
                  <span className={`ml-1 text-[10px] font-bold ${pnlCls(totalTradingPnl)}`}>
                    {fmt(totalTradingPnl)}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value='holdings' className='gap-1.5 text-xs'>
                <Layers className='h-3.5 w-3.5' /> Holdings P&L
                {totalEquityPnl !== 0 && (
                  <span className={`ml-1 text-[10px] font-bold ${pnlCls(totalEquityPnl)}`}>
                    {fmt(totalEquityPnl)}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value='intraday' className='mt-0'>
              <IntradayTab daily={daily} />
            </TabsContent>

            <TabsContent value='holdings' className='mt-0'>
              <HoldingsTab holdings={holdings} />
            </TabsContent>
          </Tabs>
        )}
      </Main>
    </>
  )
}
