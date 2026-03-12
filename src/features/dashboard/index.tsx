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
  Layers,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { snapshotsApi, type SnapshotSummary, type HoldingRow, type LiveSummary } from '@/lib/snapshots-api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
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

// ── sub-components ─────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  accent,
  valueClass,
  loading,
}: {
  title: string
  value: string
  sub?: string
  icon: React.ElementType
  accent: string
  valueClass?: string
  loading?: boolean
}) {
  return (
    <Card className='border-0 shadow-sm'>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-1'>
        <CardTitle className='text-sm font-medium text-muted-foreground'>{title}</CardTitle>
        <div className={`rounded-lg p-2 ${accent}`}>
          <Icon className='h-4 w-4' />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className='h-7 w-32 mt-1' />
        ) : (
          <div className={`text-2xl font-bold tracking-tight ${valueClass ?? ''}`}>{value}</div>
        )}
        {sub && <p className='text-xs text-muted-foreground mt-0.5'>{sub}</p>}
      </CardContent>
    </Card>
  )
}

function PnlBadge({ value }: { value: number }) {
  const pos = value >= 0
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold font-mono ${
      pos
        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
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

  // Chart data
  const chartData = history.map((h) => ({
    date: fmtDate(h.snapshot_date),
    pnl: h.total_pnl,
  }))

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

      <Main>
        {/* Page header */}
        <div className='mb-4 flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Dashboard</h1>
            {snap && (
              <p className='text-xs text-muted-foreground mt-0.5'>
                Last snapshot: {new Date(snap.captured_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
              </p>
            )}
          </div>
          <Button
            size='sm'
            onClick={() => captureMutation.mutate()}
            disabled={captureMutation.isPending}
            className='gap-1.5'
          >
            <RefreshCw className={`h-3.5 w-3.5 ${captureMutation.isPending ? 'animate-spin' : ''}`} />
            {captureMutation.isPending ? 'Capturing…' : 'Capture Now'}
          </Button>
        </div>

        {/* No-data notice */}
        {noData && (
          <Alert className='mb-4 border-indigo-200 bg-indigo-50/60 dark:border-indigo-800 dark:bg-indigo-950/40'>
            <AlertCircle className='h-4 w-4 text-indigo-600 dark:text-indigo-400' />
            <AlertTitle className='text-indigo-700 dark:text-indigo-300'>No snapshot yet</AlertTitle>
            <AlertDescription>
              Click <strong>Capture Now</strong> to take your first portfolio snapshot, or wait for the automatic 9 AM IST job.
            </AlertDescription>
          </Alert>
        )}

        {/* ── Stat cards ────────────────────────────────────────────────── */}
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-4'>
          <StatCard
            title='Total Capital'
            value={live ? fmtCurrency(live.total_capital) : snap ? fmtCurrency(snap.total_capital) : '—'}
            sub={live ? `Cash: ${fmtCurrency(live.available_cash)}` : snap ? `Cash: ${fmtCurrency(snap.available_cash)}` : undefined}
            icon={Wallet}
            accent='bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
            valueClass='text-indigo-700 dark:text-indigo-300'
            loading={latestQ.isLoading && liveQ.isLoading}
          />
          <StatCard
            title='Holdings Value'
            value={live ? fmtCurrency(live.holdings_value) : snap ? fmtCurrency(snap.holdings_value) : '—'}
            sub={live ? `Invested: ${fmtCurrency(live.total_invested)}` : snap ? `Invested: ${fmtCurrency(snap.total_invested)}` : undefined}
            icon={BarChart2}
            accent='bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
            valueClass='text-indigo-700 dark:text-indigo-300'
            loading={latestQ.isLoading && liveQ.isLoading}
          />
          <StatCard
            title='Total P&L'
            value={totalPnl !== null ? fmtCurrency(totalPnl) : '—'}
            sub={totalPnlPct !== null ? fmtPct(totalPnlPct) : undefined}
            icon={totalPnl !== null && totalPnl >= 0 ? TrendingUp : TrendingDown}
            accent={
              totalPnl !== null && totalPnl >= 0
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                : 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
            }
            valueClass={
              totalPnl !== null && totalPnl >= 0
                ? 'text-emerald-700 dark:text-emerald-300'
                : totalPnl !== null
                ? 'text-rose-700 dark:text-rose-300'
                : undefined
            }
            loading={latestQ.isLoading || liveQ.isLoading}
          />
          <StatCard
            title="Today's P&L"
            value={todayPnl !== null ? fmtCurrency(todayPnl) : '—'}
            sub={todayPnlSub}
            icon={todayPnl !== null && todayPnl >= 0 ? TrendingUp : TrendingDown}
            accent={
              todayPnl !== null && todayPnl >= 0
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                : 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
            }
            valueClass={
              todayPnl !== null && todayPnl >= 0
                ? 'text-emerald-700 dark:text-emerald-300'
                : todayPnl !== null
                ? 'text-rose-700 dark:text-rose-300'
                : undefined
            }
            loading={historyQ.isLoading}
          />
          <StatCard
            title='Stocks Held'
            value={live ? String(live.holdings_count) : snap ? String(snap.holdings_count) : '—'}
            sub={live ? 'Live' : snap ? `As of ${fmtDate(snap.snapshot_date)}` : undefined}
            icon={Layers}
            accent='bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
            loading={latestQ.isLoading && liveQ.isLoading}
          />
        </div>

        {/* ── P&L bar chart + stock table ───────────────────────────────── */}
        <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>

          {/* Daily P&L bar chart */}
          <Card className='col-span-1 lg:col-span-4 border-0 shadow-sm'>
            <CardHeader className='pb-1'>
              <CardTitle className='text-sm font-semibold'>Daily P&L (last 30 days)</CardTitle>
              <CardDescription className='text-xs'>
                Each bar represents the total portfolio P&L on that snapshot date.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyQ.isLoading ? (
                <Skeleton className='h-52 w-full rounded-lg' />
              ) : chartData.length === 0 ? (
                <div className='flex h-52 items-center justify-center text-sm text-muted-foreground'>
                  No history yet — capture a few snapshots first.
                </div>
              ) : (
                <ResponsiveContainer width='100%' height={220}>
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray='3 3' className='stroke-border' />
                    <XAxis
                      dataKey='date'
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(val) => [fmtCurrency(Number(val)), 'P&L']}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar dataKey='pnl' radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'}
                          fillOpacity={0.85}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Stock performance table */}
          <Card className='col-span-1 lg:col-span-3 border-0 shadow-sm'>
            <CardHeader className='pb-1'>
              <CardTitle className='text-sm font-semibold'>Stock Performance</CardTitle>
              <CardDescription className='text-xs'>Today's holdings from latest snapshot</CardDescription>
            </CardHeader>
            <CardContent className='p-0'>
              {latestQ.isLoading ? (
                <div className='p-4 space-y-2'>
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className='h-7 w-full' />)}
                </div>
              ) : holdings.length === 0 ? (
                <div className='flex h-40 items-center justify-center text-sm text-muted-foreground'>
                  No holdings data available.
                </div>
              ) : (
                <div className='max-h-64 overflow-y-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='pl-4'>Symbol</TableHead>
                        <TableHead className='text-right'>Qty</TableHead>
                        <TableHead className='text-right'>LTP</TableHead>
                        <TableHead className='text-right pr-4'>P&L</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...holdings]
                        .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
                        .map((h) => (
                          <TableRow key={h.symbol}>
                            <TableCell className='pl-4 font-medium text-xs'>{h.symbol}</TableCell>
                            <TableCell className='text-right text-xs'>{h.quantity}</TableCell>
                            <TableCell className='text-right text-xs font-mono'>
                              {h.ltp ? fmtCurrency(h.ltp) : '—'}
                            </TableCell>
                            <TableCell className='text-right pr-4'>
                              <PnlBadge value={h.pnl} />
                            </TableCell>
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

