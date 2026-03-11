import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp, TrendingDown, RefreshCw, AlertCircle,
  Zap, Target, Activity, Flame,
} from 'lucide-react'
import { optionsApi, OPTION_INSTRUMENTS, type RecommendedOption, type ChainRow } from '@/lib/options-api'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

// ── helpers ──────────────────────────────────────────────────────────────────

const fmtC = (v: number) =>
  `₹${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}`

const fmtN = (v: number) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v)

const fmtDate = (d: string) => {
  const dt = new Date(d)
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
}

// ── sub-components ────────────────────────────────────────────────────────────

function InstrumentBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${
        active
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900'
          : 'bg-white dark:bg-zinc-900 text-muted-foreground border border-border hover:border-indigo-300 hover:text-indigo-600 dark:hover:border-indigo-700'
      }`}
    >
      {label}
    </button>
  )
}

function ExpiryBtn({ label, active, isExpiry, onClick }: { label: string; active: boolean; isExpiry: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
        active
          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
          : 'text-muted-foreground hover:bg-muted'
      }`}
    >
      {isExpiry && <Flame className='h-3 w-3 text-orange-500' />}
      {label}
    </button>
  )
}

function RecommendCard({ opt }: { opt: RecommendedOption }) {
  const isCE = opt.type === 'CE'
  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${
      opt.is_hero_zero
        ? 'border-orange-300 bg-gradient-to-br from-orange-50 to-yellow-50 dark:border-orange-700 dark:from-orange-950/40 dark:to-yellow-950/30'
        : isCE
        ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30'
        : 'border-rose-200 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/30'
    }`}>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          {opt.is_hero_zero
            ? <Flame className='h-4 w-4 text-orange-500' />
            : isCE
            ? <TrendingUp className='h-4 w-4 text-emerald-600 dark:text-emerald-400' />
            : <TrendingDown className='h-4 w-4 text-rose-600 dark:text-rose-400' />
          }
          <span className={`text-sm font-bold ${
            opt.is_hero_zero ? 'text-orange-700 dark:text-orange-300'
            : isCE ? 'text-emerald-700 dark:text-emerald-300'
            : 'text-rose-700 dark:text-rose-300'
          }`}>{opt.tag}</span>
        </div>
        <div className='flex items-center gap-2'>
          <Badge variant='outline' className='text-xs font-mono'>{fmtC(opt.strike)}</Badge>
          <Badge variant='outline' className='text-xs'>{opt.distance_pct}% OTM</Badge>
        </div>
      </div>

      <div className='grid grid-cols-3 gap-2'>
        <div className='rounded-xl bg-white/70 dark:bg-zinc-900/70 p-2 text-center'>
          <div className='text-xs text-muted-foreground mb-0.5'>Premium</div>
          <div className='text-sm font-bold'>{fmtC(opt.premium)}</div>
        </div>
        <div className='rounded-xl bg-white/70 dark:bg-zinc-900/70 p-2 text-center'>
          <div className='text-xs text-muted-foreground mb-0.5'>Delta</div>
          <div className='text-sm font-bold'>{opt.delta}</div>
        </div>
        <div className='rounded-xl bg-white/70 dark:bg-zinc-900/70 p-2 text-center'>
          <div className='text-xs text-muted-foreground mb-0.5'>IV</div>
          <div className='text-sm font-bold'>{opt.iv}%</div>
        </div>
      </div>

      <div className='grid grid-cols-2 gap-2'>
        <div className='rounded-xl bg-white/70 dark:bg-zinc-900/70 p-2'>
          <div className='text-xs text-muted-foreground mb-0.5 flex items-center gap-1'><Target className='h-3 w-3' /> Cost / Lot</div>
          <div className='text-sm font-bold text-indigo-600 dark:text-indigo-400'>{fmtC(opt.cost_per_lot)}</div>
        </div>
        <div className='rounded-xl bg-white/70 dark:bg-zinc-900/70 p-2'>
          <div className='text-xs text-muted-foreground mb-0.5 flex items-center gap-1'><Zap className='h-3 w-3' /> Max Profit Est.</div>
          <div className='text-sm font-bold text-emerald-600 dark:text-emerald-400'>
            {opt.max_profit_estimate != null ? fmtC(opt.max_profit_estimate) : '—'}
          </div>
        </div>
      </div>

      <div className='space-y-1'>
        {opt.reasons.map((r, i) => (
          <div key={i} className='flex items-start gap-1.5 text-xs text-muted-foreground'>
            <span className='text-indigo-400 font-bold mt-0.5'>·</span>
            <span>{r}</span>
          </div>
        ))}
      </div>

      <div className='text-xs font-mono text-muted-foreground truncate'>{opt.trading_symbol}</div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function Options() {
  const [symbol, setSymbol] = useState('NIFTY')
  const [expiry, setExpiry] = useState<string | null>(null)
  const [showFullChain, setShowFullChain] = useState(false)

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['options-chain', symbol, expiry],
    queryFn: () => optionsApi.getChain(symbol, expiry ?? undefined),
    retry: 1,
    staleTime: 30_000,
  })

  const handleSymbol = useCallback((s: string) => {
    setSymbol(s)
    setExpiry(null)
  }, [])

  const errMsg = (error as any)?.response?.data?.detail ?? 'Failed to fetch option chain.'
  const today = new Date().toISOString().split('T')[0]
  const chainRows: ChainRow[] = data?.chain_table ?? []
  const displayRows = showFullChain ? chainRows : chainRows.filter(r => r.is_atm || Math.abs(r.strike - (data?.atm_strike ?? 0)) <= (data?.atm_strike ?? 1) * 0.05)

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
        <div className='mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Options</h1>
            <p className='text-sm text-muted-foreground mt-0.5'>
              OTM strike recommendations · Hero-Zero alerts · Live chain
            </p>
          </div>
          <Button
            size='sm' variant='outline' className='gap-2'
            onClick={() => refetch()} disabled={isFetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Instrument selector */}
        <div className='mb-4 flex flex-wrap gap-2'>
          {OPTION_INSTRUMENTS.map(i => (
            <InstrumentBtn key={i} label={i} active={symbol === i} onClick={() => handleSymbol(i)} />
          ))}
        </div>

        {/* Expiry selector */}
        {(data?.expiries ?? []).length > 0 && (
          <div className='mb-5 flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1 w-fit'>
            {(data!.expiries).map(exp => (
              <ExpiryBtn
                key={exp}
                label={fmtDate(exp)}
                active={(expiry ?? data?.expiries[0]) === exp}
                isExpiry={exp === today}
                onClick={() => setExpiry(exp)}
              />
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <Alert variant='destructive' className='mb-4'>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>{errMsg}</AlertDescription>
          </Alert>
        )}

        {/* Hero-Zero alert banner */}
        {data?.is_expiry_day && (
          <Alert className='mb-4 border-orange-300 bg-orange-50/70 dark:border-orange-700 dark:bg-orange-950/40'>
            <Flame className='h-4 w-4 text-orange-500' />
            <AlertTitle className='text-orange-700 dark:text-orange-300'>Today is Expiry Day!</AlertTitle>
            <AlertDescription className='text-orange-600 dark:text-orange-400'>
              Hero-Zero trades are active — cheap OTM options can give 5–20x returns if the market moves sharply.
              {data.hero_zero.length > 0
                ? ` ${data.hero_zero.length} Hero-Zero candidates found below.`
                : ' No Hero-Zero candidates found right now.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Market sentiment bar */}
        {data && !isLoading && (
          <div className='mb-5 grid grid-cols-2 sm:grid-cols-4 gap-3'>
            <Card className='border-0 shadow-sm'>
              <CardContent className='p-3'>
                <div className='text-xs text-muted-foreground mb-1'>Underlying LTP</div>
                <div className='text-lg font-bold'>{fmtC(data.underlying_ltp)}</div>
              </CardContent>
            </Card>
            <Card className='border-0 shadow-sm'>
              <CardContent className='p-3'>
                <div className='text-xs text-muted-foreground mb-1'>ATM Strike</div>
                <div className='text-lg font-bold'>{fmtC(data.atm_strike)}</div>
              </CardContent>
            </Card>
            <Card className='border-0 shadow-sm'>
              <CardContent className='p-3'>
                <div className='text-xs text-muted-foreground mb-1'>PCR</div>
                <div className='flex items-center gap-2'>
                  <span className='text-lg font-bold'>{data.pcr}</span>
                  <span className={`text-xs font-semibold rounded-lg px-2 py-0.5 ${
                    data.pcr_sentiment === 'Bullish'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : data.pcr_sentiment === 'Bearish'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}>{data.pcr_sentiment}</span>
                </div>
              </CardContent>
            </Card>
            <Card className='border-0 shadow-sm'>
              <CardContent className='p-3'>
                <div className='text-xs text-muted-foreground mb-1'>Max Pain</div>
                <div className='text-lg font-bold'>{data.max_pain ? fmtC(data.max_pain) : '—'}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
          {/* ── Left col: Tabbed Hero-Zero + OTM ── */}
          <div>
            <Card className='border-0 shadow-sm'>
              <CardHeader className='pb-2'>
                <Tabs defaultValue='herozero'>
                  <div className='flex items-center justify-between mb-2'>
                    <TabsList className='h-8'>
                      <TabsTrigger value='herozero' className='text-xs gap-1.5 h-7'>
                        <Flame className='h-3 w-3' />
                        Hero-Zero
                        {(data?.hero_zero?.length ?? 0) > 0 && (
                          <Badge className='bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 text-xs ml-0.5 px-1.5 py-0'>
                            {data!.hero_zero.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value='otm' className='text-xs gap-1.5 h-7'>
                        <Target className='h-3 w-3' />
                        OTM Picks
                        {(data?.recommended?.length ?? 0) > 0 && (
                          <Badge className='bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-xs ml-0.5 px-1.5 py-0'>
                            {data!.recommended.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Hero-Zero tab */}
                  <TabsContent value='herozero' className='mt-0'>
                    <CardDescription className='text-xs mb-3'>
                      {data?.is_expiry_day
                        ? '⚡ Expiry day — cheap OTM options with 10x potential are active'
                        : '🎯 Pre-expiry watch — track cheap OTM candidates for expiry day entry'}
                    </CardDescription>
                    {isLoading ? (
                      <div className='space-y-3'>
                        {[1, 2].map(i => <Skeleton key={i} className='h-36 w-full rounded-2xl' />)}
                      </div>
                    ) : (data?.hero_zero?.length ?? 0) === 0 ? (
                      <div className='flex flex-col items-center justify-center py-8 text-center'>
                        <Flame className='h-8 w-8 text-orange-200 dark:text-orange-900 mb-2' />
                        <p className='text-sm text-muted-foreground font-medium'>No candidates right now</p>
                        <p className='text-xs text-muted-foreground mt-1 max-w-xs'>
                          {data?.is_expiry_day
                            ? 'No cheap OTM options within range. Market may be calm.'
                            : 'Appears when OTM premiums drop below ₹50. Check near-expiry.'}
                        </p>
                      </div>
                    ) : (
                      <div className='space-y-3'>
                        {data!.hero_zero.map((opt, i) => <RecommendCard key={i} opt={opt} />)}
                      </div>
                    )}
                  </TabsContent>

                  {/* OTM tab */}
                  <TabsContent value='otm' className='mt-0'>
                    <CardDescription className='text-xs mb-3'>
                      Scored by Delta · IV · Distance · Liquidity — prefer OTM over ITM
                    </CardDescription>
                    {isLoading ? (
                      <div className='space-y-3'>
                        {[1, 2, 3].map(i => <Skeleton key={i} className='h-40 w-full rounded-2xl' />)}
                      </div>
                    ) : !data?.recommended?.length ? (
                      <div className='flex flex-col items-center justify-center py-10 text-center'>
                        <Activity className='h-8 w-8 text-muted-foreground/30 mb-2' />
                        <p className='text-sm text-muted-foreground'>No OTM opportunities found</p>
                      </div>
                    ) : (
                      <div className='space-y-3'>
                        {data.recommended.map((opt, i) => <RecommendCard key={i} opt={opt} />)}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardHeader>
            </Card>
          </div>

          {/* ── Right 2 cols: Option Chain table ── */}
          <div className='lg:col-span-2'>
            <Card className='border-0 shadow-sm'>
              <CardHeader className='pb-2'>
                <div className='flex items-center justify-between'>
                  <CardTitle className='text-sm font-semibold'>
                    Option Chain
                    {data && <span className='font-normal text-muted-foreground ml-1'>· Expiry {fmtDate(data.expiry)}</span>}
                  </CardTitle>
                  <button
                    className='text-xs text-indigo-500 hover:underline'
                    onClick={() => setShowFullChain(p => !p)}
                  >
                    {showFullChain ? 'Show Near ATM' : 'Show Full Chain'}
                  </button>
                </div>
              </CardHeader>
              <CardContent className='p-0'>
                {isLoading ? (
                  <div className='p-4 space-y-2'>
                    {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className='h-8 w-full' />)}
                  </div>
                ) : (
                  <div className='overflow-x-auto'>
                    <Table>
                      <TableHeader>
                        <TableRow className='text-xs'>
                          <TableHead className='text-emerald-600 text-right'>OI</TableHead>
                          <TableHead className='text-emerald-600 text-right'>IV</TableHead>
                          <TableHead className='text-emerald-600 text-right'>Delta</TableHead>
                          <TableHead className='text-emerald-600 text-right font-bold'>CE LTP</TableHead>
                          <TableHead className='text-center font-bold text-foreground'>STRIKE</TableHead>
                          <TableHead className='text-rose-600 font-bold'>PE LTP</TableHead>
                          <TableHead className='text-rose-600'>Delta</TableHead>
                          <TableHead className='text-rose-600'>IV</TableHead>
                          <TableHead className='text-rose-600'>OI</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayRows.map((row, i) => (
                          <TableRow
                            key={i}
                            className={`text-xs ${row.is_atm
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 font-semibold'
                              : 'hover:bg-muted/40'
                            }`}
                          >
                            <TableCell className='text-right text-emerald-600 dark:text-emerald-400 font-mono'>{fmtN(row.ce_oi)}</TableCell>
                            <TableCell className='text-right text-emerald-600 dark:text-emerald-400'>{row.ce_iv}%</TableCell>
                            <TableCell className='text-right text-emerald-600 dark:text-emerald-400'>{row.ce_delta}</TableCell>
                            <TableCell className='text-right font-bold text-emerald-700 dark:text-emerald-300'>{fmtC(row.ce_ltp)}</TableCell>
                            <TableCell className={`text-center font-bold ${row.is_atm ? 'text-indigo-700 dark:text-indigo-300' : 'text-foreground'}`}>
                              {row.is_atm && <span className='text-indigo-400 mr-1'>►</span>}
                              {fmtC(row.strike)}
                            </TableCell>
                            <TableCell className='font-bold text-rose-700 dark:text-rose-300'>{fmtC(row.pe_ltp)}</TableCell>
                            <TableCell className='text-rose-600 dark:text-rose-400'>{row.pe_delta}</TableCell>
                            <TableCell className='text-rose-600 dark:text-rose-400'>{row.pe_iv}%</TableCell>
                            <TableCell className='text-rose-600 dark:text-rose-400 font-mono'>{fmtN(row.pe_oi)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
