import { useQueries } from '@tanstack/react-query'
import {
  AlertCircle,
  BarChart3,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { portfolioApi } from '@/lib/portfolio-api'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

function fmt(val: number | undefined | null, decimals = 2) {
  if (val == null) return '—'
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val)
}

function fmtCurrency(val: number | undefined | null) {
  if (val == null) return '—'
  return `₹${fmt(val)}`
}

function PnlBadge({ value }: { value: number }) {
  const positive = value >= 0
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold font-mono ${
        positive
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
          : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
      }`}
    >
      {positive ? <TrendingUp className='h-3 w-3' /> : <TrendingDown className='h-3 w-3' />}
      {fmtCurrency(Math.abs(value))}
    </span>
  )
}

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  loading,
  accentClass,
  valueClass,
}: {
  title: string
  value: string
  sub?: string
  icon: React.ElementType
  loading?: boolean
  accentClass?: string
  valueClass?: string
}) {
  return (
    <Card className='border-0 shadow-sm'>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium text-muted-foreground'>{title}</CardTitle>
        <div className={`rounded-lg p-2 ${accentClass ?? 'bg-indigo-50 text-indigo-600'}`}>
          <Icon className='h-4 w-4' />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className='h-8 w-32' />
        ) : (
          <>
            <div className={`text-2xl font-bold tracking-tight ${valueClass ?? ''}`}>{value}</div>
            {sub && <p className='text-xs text-muted-foreground mt-1'>{sub}</p>}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function Portfolio() {
  const results = useQueries({
    queries: [
      { queryKey: ['portfolio-holdings'], queryFn: portfolioApi.getHoldings, retry: 1 },
      { queryKey: ['portfolio-positions'], queryFn: portfolioApi.getPositions, retry: 1 },
      { queryKey: ['portfolio-capital'], queryFn: portfolioApi.getCapital, retry: 1 },
    ],
  })

  const [holdingsQ, positionsQ, capitalQ] = results

  const isLoading = results.some((r) => r.isLoading)
  const noToken =
    results.some(
      (r) =>
        r.error &&
        (r.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail?.includes('token')
    )

  const refetchAll = () => results.forEach((r) => r.refetch())

  // Safely extract data — Groww returns varied shapes
  const capital = capitalQ.data as Record<string, unknown> | null
  const holdings = (holdingsQ.data as Record<string, unknown> | null)

  // Groww returns { holdings: [...] } and { positions: [...] }
  const holdingsList: Record<string, unknown>[] =
    Array.isArray((holdings as Record<string, unknown>)?.holdings)
      ? ((holdings as Record<string, unknown>).holdings as Record<string, unknown>[])
      : []

  const positions = positionsQ.data as Record<string, unknown> | null
  const positionsList: Record<string, unknown>[] =
    Array.isArray((positions as Record<string, unknown>)?.positions)
      ? ((positions as Record<string, unknown>).positions as Record<string, unknown>[])
      : []

  // Groww field names (snake_case)
  // Holdings: trading_symbol, exchange, quantity, average_price, ltp, pnl, invested_value, current_value
  // Positions: trading_symbol, exchange, product, quantity, net_price, ltp, realised_pnl
  // Capital: clear_cash, net_margin_used

  const holdingsPnl = holdingsList.reduce((acc, h) => acc + Number(h.pnl ?? h.unrealised_pnl ?? 0), 0)

  // For each position: unrealised = open_qty * (credit_price - debit_price) for sold positions
  // realised_pnl covers closed legs; open qty = credit_qty - debit_qty
  const positionsPnl = positionsList.reduce((acc, p) => {
    const realisedPnl = Number(p.realised_pnl ?? 0)
    const creditQty = Number(p.credit_quantity ?? 0)
    const debitQty = Number(p.debit_quantity ?? 0)
    const creditPrice = Number(p.credit_price ?? 0)
    const debitPrice = Number(p.debit_price ?? 0)
    // Unrealised for closed legs within this position
    const closedQty = Math.min(creditQty, debitQty)
    const unrealisedClosed = closedQty > 0 ? closedQty * (creditPrice - debitPrice) : 0
    return acc + realisedPnl + (realisedPnl === 0 ? unrealisedClosed : 0)
  }, 0)
  const totalPnl = holdingsPnl + positionsPnl

  const totalInvested = holdingsList.reduce(
    (acc, h) => acc + Number(h.invested_value ?? Number(h.average_price ?? 0) * Number(h.quantity ?? 0)),
    0
  )
  const totalCurrent = holdingsList.reduce(
    (acc, h) => acc + Number(h.current_value ?? Number(h.ltp ?? 0) * Number(h.quantity ?? 0)),
    0
  )

  // Capital: Groww uses clear_cash, net_margin_used
  const cap = capital as Record<string, unknown> | null
  const availableCash = Number(cap?.clear_cash ?? 0)
  const usedMargin = Number(cap?.net_margin_used ?? 0)

  return (
    <>
      <Header>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-6 flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Portfolio</h1>
            <p className='text-muted-foreground text-sm'>Live data from your Groww account</p>
          </div>
          <Button variant='outline' size='sm' onClick={refetchAll} disabled={isLoading}
            className='gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950'>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {noToken && (
          <Alert variant='destructive' className='mb-6'>
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>No Groww Token</AlertTitle>
            <AlertDescription>
              Please go to <strong>Settings → Broker</strong> and generate an access token first.
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6'>
          <StatCard
            title='Available Cash'
            value={fmtCurrency(availableCash)}
            icon={Wallet}
            loading={capitalQ.isLoading}
            accentClass='bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
            valueClass='text-indigo-700 dark:text-indigo-300'
          />
          <StatCard
            title='Used Margin'
            value={fmtCurrency(usedMargin)}
            icon={BarChart3}
            loading={capitalQ.isLoading}
            accentClass='bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
            valueClass='text-rose-700 dark:text-rose-300'
          />
          <StatCard
            title='Holdings Value'
            value={fmtCurrency(totalCurrent)}
            sub={`Invested: ${fmtCurrency(totalInvested)}`}
            icon={TrendingUp}
            loading={holdingsQ.isLoading}
            accentClass='bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
          />
          <StatCard
            title='Total P&L'
            value={fmtCurrency(totalPnl)}
            sub={totalInvested > 0 ? `${fmt((totalPnl / totalInvested) * 100)}%` : undefined}
            icon={totalPnl >= 0 ? TrendingUp : TrendingDown}
            loading={holdingsQ.isLoading || positionsQ.isLoading}
            accentClass={totalPnl >= 0
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
              : 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400'}
            valueClass={totalPnl >= 0
              ? 'text-emerald-700 dark:text-emerald-300'
              : 'text-rose-700 dark:text-rose-300'}
          />
        </div>

        {/* Holdings Table */}
        <Card className='mb-6 border-0 shadow-sm'>
          <CardHeader className='border-b border-indigo-50 dark:border-indigo-950'>
            <CardTitle className='text-base flex items-center gap-2'>
              <span className='h-3 w-1 rounded-full bg-indigo-500 inline-block' />
              Holdings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {holdingsQ.isLoading ? (
              <div className='space-y-2'>
                {[...Array(5)].map((_, i) => <Skeleton key={i} className='h-10 w-full' />)}
              </div>
            ) : holdingsList.length === 0 ? (
              <p className='text-sm text-muted-foreground py-4 text-center'>No holdings found.</p>
            ) : (
              <div className='overflow-x-auto'>
                <Table>
                  <TableHeader>
                    <TableRow className='bg-indigo-50/50 dark:bg-indigo-950/30'>
                      <TableHead className='text-indigo-700 dark:text-indigo-300 font-semibold'>Symbol</TableHead>
                      <TableHead className='text-indigo-700 dark:text-indigo-300 font-semibold'>Exchange</TableHead>
                      <TableHead className='text-right text-indigo-700 dark:text-indigo-300 font-semibold'>Qty</TableHead>
                      <TableHead className='text-right text-indigo-700 dark:text-indigo-300 font-semibold'>Avg Price</TableHead>
                      <TableHead className='text-right text-indigo-700 dark:text-indigo-300 font-semibold'>LTP</TableHead>
                      <TableHead className='text-right text-indigo-700 dark:text-indigo-300 font-semibold'>Invested</TableHead>
                      <TableHead className='text-right text-indigo-700 dark:text-indigo-300 font-semibold'>Current</TableHead>
                      <TableHead className='text-right text-indigo-700 dark:text-indigo-300 font-semibold'>P&L</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holdingsList.map((h, i) => {
                      const pnl = Number(h.pnl ?? h.unrealised_pnl ?? 0)
                      const invested = Number(h.invested_value ?? (Number(h.average_price ?? 0) * Number(h.quantity ?? 0)))
                      const current = Number(h.current_value ?? (Number(h.ltp ?? 0) * Number(h.quantity ?? 0)))
                      return (
                        <TableRow key={i}>
                          <TableCell className='font-medium'>{String(h.trading_symbol ?? h.symbol ?? '—')}</TableCell>
                          <TableCell className='text-muted-foreground text-xs'>{String(h.exchange ?? '—')}</TableCell>
                          <TableCell className='text-right'>{String(h.quantity ?? '—')}</TableCell>
                          <TableCell className='text-right font-mono text-xs'>{fmtCurrency(Number(h.average_price ?? 0))}</TableCell>
                          <TableCell className='text-right font-mono text-xs'>{fmtCurrency(Number(h.ltp ?? 0))}</TableCell>
                          <TableCell className='text-right font-mono text-xs'>{fmtCurrency(invested)}</TableCell>
                          <TableCell className='text-right font-mono text-xs'>{fmtCurrency(current)}</TableCell>
                          <TableCell className='text-right'><PnlBadge value={pnl} /></TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Positions Table */}
        <Card className='border-0 shadow-sm'>
          <CardHeader className='border-b border-indigo-50 dark:border-indigo-950'>
            <CardTitle className='text-base flex items-center gap-2'>
              <span className='h-3 w-1 rounded-full bg-emerald-500 inline-block' />
              Open Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {positionsQ.isLoading ? (
              <div className='space-y-2'>
                {[...Array(3)].map((_, i) => <Skeleton key={i} className='h-10 w-full' />)}
              </div>
            ) : positionsList.length === 0 ? (
              <p className='text-sm text-muted-foreground py-4 text-center'>No open positions.</p>
            ) : (
              <div className='overflow-x-auto'>
                <Table>
                  <TableHeader>
                    <TableRow className='bg-emerald-50/50 dark:bg-emerald-950/30'>
                      <TableHead className='text-emerald-700 dark:text-emerald-300 font-semibold'>Symbol</TableHead>
                      <TableHead className='text-emerald-700 dark:text-emerald-300 font-semibold'>Segment</TableHead>
                      <TableHead className='text-emerald-700 dark:text-emerald-300 font-semibold'>Product</TableHead>
                      <TableHead className='text-right text-emerald-700 dark:text-emerald-300 font-semibold'>Buy Qty</TableHead>
                      <TableHead className='text-right text-emerald-700 dark:text-emerald-300 font-semibold'>Sell Qty</TableHead>
                      <TableHead className='text-right text-emerald-700 dark:text-emerald-300 font-semibold'>Avg Buy</TableHead>
                      <TableHead className='text-right text-emerald-700 dark:text-emerald-300 font-semibold'>Avg Sell</TableHead>
                      <TableHead className='text-right text-emerald-700 dark:text-emerald-300 font-semibold'>P&L</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {positionsList.map((p, i) => {
                      const realisedPnl = Number(p.realised_pnl ?? 0)
                      const creditQty = Number(p.credit_quantity ?? 0)
                      const debitQty = Number(p.debit_quantity ?? 0)
                      const creditPrice = Number(p.credit_price ?? 0)
                      const debitPrice = Number(p.debit_price ?? 0)
                      // Use realised_pnl if non-zero (closed trade), else compute from prices
                      const pnl = realisedPnl !== 0
                        ? realisedPnl
                        : (Math.min(creditQty, debitQty) * (creditPrice - debitPrice))
                      return (
                        <TableRow key={i}>
                          <TableCell className='font-medium text-xs'>{String(p.trading_symbol ?? '—')}</TableCell>
                          <TableCell className='text-xs'>{String(p.segment ?? '—')}</TableCell>
                          <TableCell className='text-xs'>{String(p.product ?? '—')}</TableCell>
                          <TableCell className='text-right text-xs'>{creditQty || '—'}</TableCell>
                          <TableCell className='text-right text-xs'>{debitQty || '—'}</TableCell>
                          <TableCell className='text-right font-mono text-xs'>{creditPrice ? fmtCurrency(creditPrice) : '—'}</TableCell>
                          <TableCell className='text-right font-mono text-xs'>{debitPrice ? fmtCurrency(debitPrice) : '—'}</TableCell>
                          <TableCell className='text-right'><PnlBadge value={pnl} /></TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
