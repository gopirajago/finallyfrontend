import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  BarChart2,
  RefreshCw,
  AlertCircle,
  Activity,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { snapshotsApi, type SnapshotSummary, type HoldingRow, type LiveSummary, type PositionRow } from '@/lib/snapshots-api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

// ── helpers ────────────────────────────────────────────────────────────────

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)

const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`

const fmtDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

const pnlColor = (v: number | null) =>
  v === null ? 'text-foreground'
  : v >= 0   ? 'text-emerald-600 dark:text-emerald-400'
  :             'text-rose-600 dark:text-rose-400'

// ── sub-components ─────────────────────────────────────────────────────────


function PnlBadge({ value }: { value: number }) {
  const pos = value >= 0
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold font-mono ${
      pos ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
          : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
    }`}>
      {pos ? <TrendingUp className='h-3 w-3' /> : <TrendingDown className='h-3 w-3' />}
      {fmtCurrency(Math.abs(value))}
    </span>
  )
}


// ── main component ─────────────────────────────────────────────────────────

export function Dashboard() {
  const queryClient = useQueryClient()

  const latestQ = useQuery({
    queryKey: ['snapshot-latest'],
    queryFn: snapshotsApi.getLatest,
    retry: false,
    staleTime: 0,
  })

  const historyQ = useQuery({
    queryKey: ['snapshot-history'],
    queryFn: () => snapshotsApi.getHistory(30),
    retry: false,
    staleTime: 0,
  })

  const liveQ = useQuery<LiveSummary>({
    queryKey: ['portfolio-live'],
    queryFn: snapshotsApi.getLiveSummary,
    retry: false,
    staleTime: 60_000,
    refetchInterval: 60_000,
  })

  const captureMutation = useMutation({
    mutationFn: snapshotsApi.captureNow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snapshot-latest'] })
      queryClient.invalidateQueries({ queryKey: ['snapshot-history'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio-live'] })
      toast.success('Snapshot captured', { description: 'Portfolio data updated successfully.' })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Failed to capture snapshot.'
      toast.error('Capture failed', { description: msg })
    },
  })

  const snap = latestQ.data
  const live: LiveSummary | undefined = liveQ.data
  const history: SnapshotSummary[] = historyQ.data ?? []
  // Prefer live holdings if available, fall back to last snapshot
  const holdings: HoldingRow[] = live?.holdings ?? snap?.holdings_json ?? []
  const noData = !latestQ.isLoading && !liveQ.isLoading && !snap && !live

  // history is sorted ascending: history[last] = most recent, history[last-1] = previous
  const todaySnap = history.length > 0 ? history[history.length - 1] : null
  const prevSnap  = history.length > 1 ? history[history.length - 2] : null

  // Total P&L: live if available, else from latest snapshot
  const totalPnl    = live?.total_pnl    ?? snap?.total_pnl    ?? todaySnap?.total_pnl    ?? null
  const totalPnlPct = live?.total_pnl_pct ?? snap?.total_pnl_pct ?? todaySnap?.total_pnl_pct ?? null

  // Today's P&L = today's total_pnl minus previous day's total_pnl
  const todayPnl = live !== undefined && prevSnap !== null
    ? live.total_pnl - prevSnap.total_pnl
    : live !== undefined && prevSnap === null
    ? live.total_pnl
    : todaySnap !== null && prevSnap !== null
    ? todaySnap.total_pnl - prevSnap.total_pnl
    : todaySnap !== null
    ? todaySnap.total_pnl
    : null
  const todayPnlSub = prevSnap
    ? `vs ${fmtDate(prevSnap.snapshot_date)}`
    : todaySnap
    ? 'First snapshot'
    : '—'

  // Intraday & FNO P&L (live preferred, else today's snapshot)
  const intradayPnl = live?.intraday_pnl ?? todaySnap?.intraday_pnl ?? null
  const fnoPnl      = live?.fno_pnl      ?? todaySnap?.fno_pnl      ?? null
  const positions: PositionRow[] = live?.positions ?? []

  // Chart data — multi-series
  const chartData = history.map((h) => ({
    date: fmtDate(h.snapshot_date),
    equity: h.total_pnl,
    intraday: h.intraday_pnl ?? 0,
    fno: h.fno_pnl ?? 0,
  }))

  const isLoading = latestQ.isLoading || liveQ.isLoading

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

        {/* ── Page title ── */}
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-xl font-bold tracking-tight'>Portfolio Dashboard</h1>
            <p className='text-xs text-muted-foreground mt-0.5'>
              {snap ? `Updated ${new Date(snap.captured_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })} IST` : 'No snapshot yet'}
            </p>
          </div>
          <Button size='sm' onClick={() => captureMutation.mutate()} disabled={captureMutation.isPending}
            className='gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs'>
            <RefreshCw className={`h-3 w-3 ${captureMutation.isPending ? 'animate-spin' : ''}`} />
            {captureMutation.isPending ? 'Capturing…' : 'Capture Now'}
          </Button>
        </div>

        {noData && (
          <Alert className='border-indigo-200 bg-indigo-50/60 dark:border-indigo-800 dark:bg-indigo-950/40'>
            <AlertCircle className='h-4 w-4 text-indigo-600 dark:text-indigo-400' />
            <AlertTitle className='text-indigo-700 dark:text-indigo-300'>No snapshot yet</AlertTitle>
            <AlertDescription>Click <strong>Capture Now</strong> to take your first portfolio snapshot.</AlertDescription>
          </Alert>
        )}

        {/* ── Row 1: 6-col KPI strip ── */}
        <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3'>
          {/* Capital */}
          <Card className='border-0 shadow-sm col-span-1'>
            <CardContent className='p-3'>
              <div className='flex items-center justify-between mb-1.5'>
                <p className='text-[11px] font-medium text-muted-foreground'>Total Capital</p>
                <Wallet className='h-3.5 w-3.5 text-indigo-400' />
              </div>
              {isLoading ? <Skeleton className='h-6 w-24' /> : <p className='text-base font-bold tabular-nums text-indigo-600 dark:text-indigo-400'>{live ? fmtCurrency(live.total_capital) : snap ? fmtCurrency(snap.total_capital) : '—'}</p>}
              <p className='text-[10px] text-muted-foreground mt-0.5'>{isLoading ? '' : live ? `Cash: ${fmtCurrency(live.available_cash)}` : snap ? `Cash: ${fmtCurrency(snap.available_cash)}` : ''}</p>
            </CardContent>
          </Card>
          {/* Holdings Value */}
          <Card className='border-0 shadow-sm col-span-1'>
            <CardContent className='p-3'>
              <div className='flex items-center justify-between mb-1.5'>
                <p className='text-[11px] font-medium text-muted-foreground'>Holdings Value</p>
                <BarChart2 className='h-3.5 w-3.5 text-indigo-400' />
              </div>
              {isLoading ? <Skeleton className='h-6 w-24' /> : <p className='text-base font-bold tabular-nums text-indigo-600 dark:text-indigo-400'>{live ? fmtCurrency(live.holdings_value) : snap ? fmtCurrency(snap.holdings_value) : '—'}</p>}
              <p className='text-[10px] text-muted-foreground mt-0.5'>{isLoading ? '' : live ? `Invested: ${fmtCurrency(live.total_invested)}` : snap ? `Invested: ${fmtCurrency(snap.total_invested)}` : ''}</p>
            </CardContent>
          </Card>
          {/* Equity P&L */}
          <Card className='border-0 shadow-sm col-span-1'>
            <CardContent className='p-3'>
              <div className='flex items-center justify-between mb-1.5'>
                <p className='text-[11px] font-medium text-muted-foreground'>Equity P&L</p>
                {totalPnl !== null && (totalPnl >= 0 ? <TrendingUp className='h-3.5 w-3.5 text-emerald-500' /> : <TrendingDown className='h-3.5 w-3.5 text-rose-500' />)}
              </div>
              {isLoading ? <Skeleton className='h-6 w-24' /> : <p className={`text-base font-bold tabular-nums ${pnlColor(totalPnl)}`}>{totalPnl !== null ? fmtCurrency(totalPnl) : '—'}</p>}
              <p className='text-[10px] text-muted-foreground mt-0.5'>{totalPnlPct !== null ? fmtPct(totalPnlPct) : 'All time'}</p>
            </CardContent>
          </Card>
          {/* Today P&L */}
          <Card className='border-0 shadow-sm col-span-1'>
            <CardContent className='p-3'>
              <div className='flex items-center justify-between mb-1.5'>
                <p className='text-[11px] font-medium text-muted-foreground'>Today's P&L</p>
                {todayPnl !== null && (todayPnl >= 0 ? <TrendingUp className='h-3.5 w-3.5 text-emerald-500' /> : <TrendingDown className='h-3.5 w-3.5 text-rose-500' />)}
              </div>
              {historyQ.isLoading ? <Skeleton className='h-6 w-24' /> : <p className={`text-base font-bold tabular-nums ${pnlColor(todayPnl)}`}>{todayPnl !== null ? fmtCurrency(todayPnl) : '—'}</p>}
              <p className='text-[10px] text-muted-foreground mt-0.5'>{todayPnlSub}</p>
            </CardContent>
          </Card>
          {/* Intraday P&L */}
          <Card className='border-0 shadow-sm col-span-1'>
            <CardContent className='p-3'>
              <div className='flex items-center justify-between mb-1.5'>
                <p className='text-[11px] font-medium text-muted-foreground'>Intraday P&L</p>
                <Zap className='h-3.5 w-3.5 text-amber-400' />
              </div>
              {liveQ.isLoading ? <Skeleton className='h-6 w-24' /> : <p className={`text-base font-bold tabular-nums ${pnlColor(intradayPnl)}`}>{intradayPnl !== null ? fmtCurrency(intradayPnl) : '—'}</p>}
              <p className='text-[10px] text-muted-foreground mt-0.5'>Today · equity</p>
            </CardContent>
          </Card>
          {/* F&O P&L */}
          <Card className='border-0 shadow-sm col-span-1'>
            <CardContent className='p-3'>
              <div className='flex items-center justify-between mb-1.5'>
                <p className='text-[11px] font-medium text-muted-foreground'>F&O P&L</p>
                <Activity className='h-3.5 w-3.5 text-violet-400' />
              </div>
              {liveQ.isLoading ? <Skeleton className='h-6 w-24' /> : <p className={`text-base font-bold tabular-nums ${pnlColor(fnoPnl)}`}>{fnoPnl !== null ? fmtCurrency(fnoPnl) : '—'}</p>}
              <p className='text-[10px] text-muted-foreground mt-0.5'>Today · F&O</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Row 2: Charts side by side ── */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          {/* Equity P&L chart */}
          <Card className='border-0 shadow-sm'>
            <CardHeader className='py-3 px-4'>
              <CardTitle className='text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide'>
                <BarChart2 className='h-3.5 w-3.5 text-indigo-500' /> Equity P&L · last 30 days
              </CardTitle>
            </CardHeader>
            <CardContent className='px-2 pb-3 pt-0'>
              {historyQ.isLoading ? (
                <Skeleton className='h-40 w-full rounded-lg' />
              ) : chartData.length === 0 ? (
                <div className='flex h-40 items-center justify-center text-xs text-muted-foreground'>No data — click Capture Now first.</div>
              ) : (
                <ResponsiveContainer width='100%' height={150}>
                  <BarChart data={chartData} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' vertical={false} />
                    <XAxis dataKey='date' tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis
                      tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={56}
                      tickFormatter={(v) => {
                        const n = Number(v)
                        if (Math.abs(n) >= 100000) return `₹${(n/100000).toFixed(1)}L`
                        if (Math.abs(n) >= 1000) return `₹${(n/1000).toFixed(0)}k`
                        return `₹${n}`
                      }}
                    />
                    <Tooltip
                      formatter={(val) => [fmtCurrency(Number(val)), 'Equity P&L']}
                      contentStyle={{ fontSize: 11, borderRadius: 8 }}
                    />
                    <Bar dataKey='equity' radius={[4, 4, 0, 0]} maxBarSize={48} minPointSize={3}
                      label={{ position: 'top', fontSize: 9, formatter: (v: unknown) => Number(v) !== 0 ? fmtCurrency(Number(v)) : '' }}>
                      {chartData.map((e, i) => <Cell key={i} fill={e.equity >= 0 ? '#6366f1' : '#f43f5e'} fillOpacity={0.9} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Intraday + FNO chart */}
          <Card className='border-0 shadow-sm'>
            <CardHeader className='py-3 px-4'>
              <CardTitle className='text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide'>
                <Zap className='h-3.5 w-3.5 text-amber-500' /> Intraday &amp; F&O · last 30 days
              </CardTitle>
            </CardHeader>
            <CardContent className='px-2 pb-3 pt-0'>
              {historyQ.isLoading ? (
                <Skeleton className='h-40 w-full rounded-lg' />
              ) : chartData.length === 0 ? (
                <div className='flex h-40 items-center justify-center text-xs text-muted-foreground'>No data — click Capture Now first.</div>
              ) : (
                <ResponsiveContainer width='100%' height={150}>
                  <BarChart data={chartData} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' vertical={false} />
                    <XAxis dataKey='date' tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis
                      tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={56}
                      tickFormatter={(v) => {
                        const n = Number(v)
                        if (Math.abs(n) >= 100000) return `₹${(n/100000).toFixed(1)}L`
                        if (Math.abs(n) >= 1000) return `₹${(n/1000).toFixed(0)}k`
                        return `₹${n}`
                      }}
                    />
                    <Tooltip
                      formatter={(val, name) => [fmtCurrency(Number(val)), String(name) === 'intraday' ? 'Intraday' : 'F&O']}
                      contentStyle={{ fontSize: 11, borderRadius: 8 }}
                    />
                    <Bar dataKey='intraday' radius={[4, 4, 0, 0]} maxBarSize={32} minPointSize={3}
                      label={{ position: 'top', fontSize: 9, formatter: (v: unknown) => Number(v) !== 0 ? fmtCurrency(Number(v)) : '' }}>
                      {chartData.map((e, i) => <Cell key={i} fill={e.intraday >= 0 ? '#10b981' : '#f43f5e'} fillOpacity={0.9} />)}
                    </Bar>
                    <Bar dataKey='fno' radius={[4, 4, 0, 0]} maxBarSize={32} minPointSize={3}
                      label={{ position: 'top', fontSize: 9, formatter: (v: unknown) => Number(v) !== 0 ? fmtCurrency(Number(v)) : '' }}>
                      {chartData.map((e, i) => <Cell key={i} fill={e.fno >= 0 ? '#f59e0b' : '#ef4444'} fillOpacity={0.9} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Row 3: Holdings + Positions tables ── */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          {/* Holdings */}
          <Card className='border-0 shadow-sm'>
            <CardHeader className='py-3 px-4'>
              <CardTitle className='text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide'>
                <BarChart2 className='h-3.5 w-3.5 text-indigo-500' /> Stock Holdings
                {holdings.length > 0 && <span className='ml-auto normal-case font-normal'>{holdings.length} stocks</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className='p-0'>
              {liveQ.isLoading ? (
                <div className='p-3 space-y-2'>{[...Array(3)].map((_, i) => <Skeleton key={i} className='h-7 w-full' />)}</div>
              ) : holdings.length === 0 ? (
                <div className='flex h-24 items-center justify-center text-xs text-muted-foreground'>No holdings data.</div>
              ) : (
                <div className='max-h-56 overflow-y-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow className='hover:bg-transparent'>
                        <TableHead className='pl-4 h-8 text-xs'>Symbol</TableHead>
                        <TableHead className='text-right h-8 text-xs'>Qty</TableHead>
                        <TableHead className='text-right h-8 text-xs'>Avg</TableHead>
                        <TableHead className='text-right h-8 text-xs'>LTP</TableHead>
                        <TableHead className='text-right pr-4 h-8 text-xs'>P&L</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...holdings].sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl)).map((h) => (
                        <TableRow key={h.symbol} className='hover:bg-muted/30'>
                          <TableCell className='pl-4 py-2 font-semibold text-xs'>{h.symbol}</TableCell>
                          <TableCell className='text-right py-2 text-xs text-muted-foreground'>{h.quantity}</TableCell>
                          <TableCell className='text-right py-2 text-xs font-mono text-muted-foreground'>{fmtCurrency(h.avg_price)}</TableCell>
                          <TableCell className='text-right py-2 text-xs font-mono'>{h.ltp ? fmtCurrency(h.ltp) : '—'}</TableCell>
                          <TableCell className='text-right pr-4 py-2'><PnlBadge value={h.pnl} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Positions */}
          <Card className='border-0 shadow-sm'>
            <CardHeader className='py-3 px-4'>
              <CardTitle className='text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide'>
                <Zap className='h-3.5 w-3.5 text-amber-500' /> Intraday &amp; F&O Positions
                {positions.length > 0 && <span className='ml-auto normal-case font-normal'>{positions.length} trades</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className='p-0'>
              {liveQ.isLoading ? (
                <div className='p-3 space-y-2'>{[...Array(3)].map((_, i) => <Skeleton key={i} className='h-7 w-full' />)}</div>
              ) : positions.length === 0 ? (
                <div className='flex h-24 items-center justify-center text-xs text-muted-foreground'>No positions today.</div>
              ) : (
                <div className='max-h-56 overflow-y-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow className='hover:bg-transparent'>
                        <TableHead className='pl-4 h-8 text-xs'>Symbol</TableHead>
                        <TableHead className='h-8 text-xs'>Type</TableHead>
                        <TableHead className='text-right h-8 text-xs'>Qty</TableHead>
                        <TableHead className='text-right h-8 text-xs'>Realised</TableHead>
                        <TableHead className='text-right pr-4 h-8 text-xs'>P&L</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...positions].sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl)).map((p, i) => (
                        <TableRow key={i} className='hover:bg-muted/30'>
                          <TableCell className='pl-4 py-2 font-semibold text-xs truncate max-w-[120px]'>{p.symbol}</TableCell>
                          <TableCell className='py-2'>
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                              p.segment === 'FNO' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                                  : 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                            }`}>{p.segment}</span>
                          </TableCell>
                          <TableCell className='text-right py-2 text-xs text-muted-foreground'>{p.quantity}</TableCell>
                          <TableCell className={`text-right py-2 text-xs font-mono ${pnlColor(p.realised_pnl)}`}>{fmtCurrency(p.realised_pnl)}</TableCell>
                          <TableCell className='text-right pr-4 py-2'><PnlBadge value={p.pnl} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </Main>
    </>
  )
}

