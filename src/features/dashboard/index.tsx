import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AreaChart,
  Area,
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
  Layers,
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

function KpiCard({
  title, value, sub, icon: Icon, iconBg, valueClass, loading, trend,
}: {
  title: string; value: string; sub?: string; icon: React.ElementType
  iconBg: string; valueClass?: string; loading?: boolean; trend?: 'up' | 'down' | null
}) {
  return (
    <Card className='border-0 shadow-sm bg-card'>
      <CardContent className='p-4'>
        <div className='flex items-start justify-between mb-3'>
          <div className={`rounded-xl p-2.5 ${iconBg}`}>
            <Icon className='h-4 w-4' />
          </div>
          {trend !== undefined && trend !== null && (
            <span className={`text-xs font-semibold flex items-center gap-0.5 ${trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {trend === 'up' ? <TrendingUp className='h-3 w-3' /> : <TrendingDown className='h-3 w-3' />}
            </span>
          )}
        </div>
        <div className='space-y-0.5'>
          <p className='text-xs text-muted-foreground font-medium'>{title}</p>
          {loading ? (
            <Skeleton className='h-7 w-28 mt-1' />
          ) : (
            <p className={`text-xl font-bold tracking-tight tabular-nums ${valueClass ?? ''}`}>{value}</p>
          )}
          {sub && <p className='text-xs text-muted-foreground'>{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2'>{children}</p>
  )
}

// ── main component ─────────────────────────────────────────────────────────

export function Dashboard() {
  const queryClient = useQueryClient()

  const latestQ = useQuery({
    queryKey: ['snapshot-latest'],
    queryFn: snapshotsApi.getLatest,
    retry: false,
  })

  const historyQ = useQuery({
    queryKey: ['snapshot-history'],
    queryFn: () => snapshotsApi.getHistory(30),
    retry: false,
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

      <Main className='flex flex-col gap-6'>

        {/* ── Page title ── */}
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Portfolio Dashboard</h1>
            <p className='text-xs text-muted-foreground mt-0.5'>
              {snap
                ? `Updated ${new Date(snap.captured_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })} IST`
                : 'No snapshot yet'}
            </p>
          </div>
          <Button
            size='sm'
            onClick={() => captureMutation.mutate()}
            disabled={captureMutation.isPending}
            className='gap-2 bg-indigo-600 hover:bg-indigo-700 text-white'
          >
            <RefreshCw className={`h-3.5 w-3.5 ${captureMutation.isPending ? 'animate-spin' : ''}`} />
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

        {/* ── Row 1: Capital overview (2 wide cards) ── */}
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>

          {/* Capital card */}
          <Card className='border-0 shadow-sm bg-gradient-to-br from-indigo-500 to-indigo-700 text-white'>
            <CardContent className='p-5'>
              <div className='flex items-center justify-between mb-4'>
                <div className='flex items-center gap-2'>
                  <div className='rounded-xl bg-white/20 p-2'>
                    <Wallet className='h-4 w-4' />
                  </div>
                  <span className='text-sm font-medium text-indigo-100'>Total Capital</span>
                </div>
                <span className='text-xs bg-white/20 rounded-full px-2 py-0.5 text-indigo-100'>Live</span>
              </div>
              {isLoading ? <Skeleton className='h-9 w-40 bg-white/20' /> : (
                <p className='text-3xl font-bold tracking-tight tabular-nums'>
                  {live ? fmtCurrency(live.total_capital) : snap ? fmtCurrency(snap.total_capital) : '—'}
                </p>
              )}
              <div className='mt-3 flex gap-4'>
                <div>
                  <p className='text-xs text-indigo-200'>Free Cash</p>
                  <p className='text-sm font-semibold'>
                    {isLoading ? '…' : live ? fmtCurrency(live.available_cash) : snap ? fmtCurrency(snap.available_cash) : '—'}
                  </p>
                </div>
                <div>
                  <p className='text-xs text-indigo-200'>Used Margin</p>
                  <p className='text-sm font-semibold'>
                    {isLoading ? '…' : live ? fmtCurrency(live.used_margin) : snap ? fmtCurrency(snap.used_margin) : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Holdings card */}
          <Card className='border-0 shadow-sm bg-gradient-to-br from-slate-700 to-slate-900 text-white'>
            <CardContent className='p-5'>
              <div className='flex items-center justify-between mb-4'>
                <div className='flex items-center gap-2'>
                  <div className='rounded-xl bg-white/20 p-2'>
                    <BarChart2 className='h-4 w-4' />
                  </div>
                  <span className='text-sm font-medium text-slate-200'>Holdings Value</span>
                </div>
                <span className='text-xs bg-white/10 rounded-full px-2 py-0.5 text-slate-300'>
                  {live ? `${live.holdings_count} stocks` : snap ? `${snap.holdings_count} stocks` : '—'}
                </span>
              </div>
              {isLoading ? <Skeleton className='h-9 w-40 bg-white/20' /> : (
                <p className='text-3xl font-bold tracking-tight tabular-nums'>
                  {live ? fmtCurrency(live.holdings_value) : snap ? fmtCurrency(snap.holdings_value) : '—'}
                </p>
              )}
              <div className='mt-3 flex gap-4'>
                <div>
                  <p className='text-xs text-slate-400'>Invested</p>
                  <p className='text-sm font-semibold'>
                    {isLoading ? '…' : live ? fmtCurrency(live.total_invested) : snap ? fmtCurrency(snap.total_invested) : '—'}
                  </p>
                </div>
                <div>
                  <p className='text-xs text-slate-400'>Unrealised P&L</p>
                  <p className={`text-sm font-semibold ${pnlColor(totalPnl)}`}>
                    {isLoading ? '…' : totalPnl !== null ? `${totalPnl >= 0 ? '+' : ''}${fmtCurrency(totalPnl)}` : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Row 2: P&L KPI strip ── */}
        <div>
          <SectionLabel>P&amp;L Summary</SectionLabel>
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
            <KpiCard
              title='Equity P&L' icon={TrendingUp}
              value={totalPnl !== null ? fmtCurrency(totalPnl) : '—'}
              sub={totalPnlPct !== null ? fmtPct(totalPnlPct) : 'All time'}
              iconBg={totalPnl !== null && totalPnl >= 0 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'}
              valueClass={pnlColor(totalPnl)}
              trend={totalPnl !== null ? (totalPnl >= 0 ? 'up' : 'down') : null}
              loading={isLoading}
            />
            <KpiCard
              title="Today's P&L" icon={Activity}
              value={todayPnl !== null ? fmtCurrency(todayPnl) : '—'}
              sub={todayPnlSub}
              iconBg={todayPnl !== null && todayPnl >= 0 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'}
              valueClass={pnlColor(todayPnl)}
              trend={todayPnl !== null ? (todayPnl >= 0 ? 'up' : 'down') : null}
              loading={historyQ.isLoading}
            />
            <KpiCard
              title='Intraday P&L' icon={Zap}
              value={intradayPnl !== null ? fmtCurrency(intradayPnl) : '—'}
              sub='Today · equity trades'
              iconBg={intradayPnl !== null && intradayPnl >= 0 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'}
              valueClass={pnlColor(intradayPnl)}
              trend={intradayPnl !== null ? (intradayPnl >= 0 ? 'up' : 'down') : null}
              loading={liveQ.isLoading}
            />
            <KpiCard
              title='F&O P&L' icon={Layers}
              value={fnoPnl !== null ? fmtCurrency(fnoPnl) : '—'}
              sub='Today · futures & options'
              iconBg={fnoPnl !== null && fnoPnl >= 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'}
              valueClass={pnlColor(fnoPnl)}
              trend={fnoPnl !== null ? (fnoPnl >= 0 ? 'up' : 'down') : null}
              loading={liveQ.isLoading}
            />
          </div>
        </div>

        {/* ── Row 3: Charts ── */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>

          {/* Equity P&L area chart */}
          <Card className='border-0 shadow-sm'>
            <CardHeader className='pb-2 pt-4 px-4'>
              <CardTitle className='text-sm font-semibold flex items-center gap-2'>
                <BarChart2 className='h-4 w-4 text-indigo-500' />
                Equity P&L History
              </CardTitle>
            </CardHeader>
            <CardContent className='px-2 pb-3'>
              {historyQ.isLoading ? (
                <Skeleton className='h-48 w-full rounded-lg' />
              ) : chartData.length === 0 ? (
                <div className='flex h-48 items-center justify-center text-sm text-muted-foreground'>No history — capture snapshots first.</div>
              ) : (
                <ResponsiveContainer width='100%' height={180}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id='equityGrad' x1='0' y1='0' x2='0' y2='1'>
                        <stop offset='5%' stopColor='#6366f1' stopOpacity={0.25} />
                        <stop offset='95%' stopColor='#6366f1' stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray='3 3' className='stroke-border' />
                    <XAxis dataKey='date' tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={45} />
                    <Tooltip formatter={(val) => [fmtCurrency(Number(val)), 'Equity P&L']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Area dataKey='equity' stroke='#6366f1' strokeWidth={2} fill='url(#equityGrad)' dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Intraday + FNO bar chart */}
          <Card className='border-0 shadow-sm'>
            <CardHeader className='pb-2 pt-4 px-4'>
              <CardTitle className='text-sm font-semibold flex items-center gap-2'>
                <Zap className='h-4 w-4 text-amber-500' />
                Intraday &amp; F&O P&L History
              </CardTitle>
            </CardHeader>
            <CardContent className='px-2 pb-3'>
              {historyQ.isLoading ? (
                <Skeleton className='h-48 w-full rounded-lg' />
              ) : chartData.length === 0 ? (
                <div className='flex h-48 items-center justify-center text-sm text-muted-foreground'>No history — capture snapshots first.</div>
              ) : (
                <ResponsiveContainer width='100%' height={180}>
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray='3 3' className='stroke-border' />
                    <XAxis dataKey='date' tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={45} />
                    <Tooltip
                      formatter={(val, name) => [fmtCurrency(Number(val)), name === 'intraday' ? 'Intraday' : 'F&O']}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar dataKey='intraday' name='intraday' radius={[3, 3, 0, 0]}>
                      {chartData.map((e, i) => <Cell key={i} fill={e.intraday >= 0 ? '#10b981' : '#f43f5e'} fillOpacity={0.85} />)}
                    </Bar>
                    <Bar dataKey='fno' name='fno' radius={[3, 3, 0, 0]}>
                      {chartData.map((e, i) => <Cell key={i} fill={e.fno >= 0 ? '#f59e0b' : '#ef4444'} fillOpacity={0.85} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Row 4: Holdings + Positions tables ── */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>

          {/* Holdings */}
          <Card className='border-0 shadow-sm'>
            <CardHeader className='pb-2 pt-4 px-4'>
              <CardTitle className='text-sm font-semibold flex items-center gap-2'>
                <BarChart2 className='h-4 w-4 text-indigo-500' />
                Stock Holdings
                {holdings.length > 0 && (
                  <span className='ml-auto text-xs font-normal text-muted-foreground'>{holdings.length} stocks</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className='p-0'>
              {liveQ.isLoading ? (
                <div className='p-4 space-y-2'>{[...Array(4)].map((_, i) => <Skeleton key={i} className='h-8 w-full' />)}</div>
              ) : holdings.length === 0 ? (
                <div className='flex h-32 items-center justify-center text-sm text-muted-foreground'>No holdings data.</div>
              ) : (
                <div className='max-h-64 overflow-y-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow className='hover:bg-transparent'>
                        <TableHead className='pl-4 text-xs'>Symbol</TableHead>
                        <TableHead className='text-right text-xs'>Qty</TableHead>
                        <TableHead className='text-right text-xs'>Avg</TableHead>
                        <TableHead className='text-right text-xs'>LTP</TableHead>
                        <TableHead className='text-right pr-4 text-xs'>P&L</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...holdings].sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl)).map((h) => (
                        <TableRow key={h.symbol} className='hover:bg-muted/40'>
                          <TableCell className='pl-4 font-semibold text-xs'>{h.symbol}</TableCell>
                          <TableCell className='text-right text-xs text-muted-foreground'>{h.quantity}</TableCell>
                          <TableCell className='text-right text-xs font-mono text-muted-foreground'>{fmtCurrency(h.avg_price)}</TableCell>
                          <TableCell className='text-right text-xs font-mono'>{h.ltp ? fmtCurrency(h.ltp) : '—'}</TableCell>
                          <TableCell className='text-right pr-4'><PnlBadge value={h.pnl} /></TableCell>
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
            <CardHeader className='pb-2 pt-4 px-4'>
              <CardTitle className='text-sm font-semibold flex items-center gap-2'>
                <Zap className='h-4 w-4 text-amber-500' />
                Intraday &amp; F&O Positions
                {positions.length > 0 && (
                  <span className='ml-auto text-xs font-normal text-muted-foreground'>{positions.length} trades</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className='p-0'>
              {liveQ.isLoading ? (
                <div className='p-4 space-y-2'>{[...Array(4)].map((_, i) => <Skeleton key={i} className='h-8 w-full' />)}</div>
              ) : positions.length === 0 ? (
                <div className='flex h-32 items-center justify-center text-sm text-muted-foreground'>No positions today.</div>
              ) : (
                <div className='max-h-64 overflow-y-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow className='hover:bg-transparent'>
                        <TableHead className='pl-4 text-xs'>Symbol</TableHead>
                        <TableHead className='text-xs'>Type</TableHead>
                        <TableHead className='text-right text-xs'>Qty</TableHead>
                        <TableHead className='text-right text-xs'>Realised</TableHead>
                        <TableHead className='text-right pr-4 text-xs'>Total P&L</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...positions].sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl)).map((p, i) => (
                        <TableRow key={i} className='hover:bg-muted/40'>
                          <TableCell className='pl-4 font-semibold text-xs max-w-[130px] truncate'>{p.symbol}</TableCell>
                          <TableCell>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              p.segment === 'FNO'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                            }`}>{p.segment}</span>
                          </TableCell>
                          <TableCell className='text-right text-xs text-muted-foreground'>{p.quantity}</TableCell>
                          <TableCell className={`text-right text-xs font-mono ${pnlColor(p.realised_pnl)}`}>
                            {fmtCurrency(p.realised_pnl)}
                          </TableCell>
                          <TableCell className='text-right pr-4'><PnlBadge value={p.pnl} /></TableCell>
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

