import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Activity, TrendingUp, TrendingDown, Zap, BarChart2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { strategyApi } from '@/lib/strategy-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { StrategyConfigDialog } from './components/strategy-config-dialog'
import { SignalStrengthCard } from './components/signal-strength-card'
import { ActiveTradeCard } from './components/active-trade-card'
import { ActiveStrategiesCard } from './components/active-strategies-card'
import type { StrategySignal } from '@/lib/strategy-api'
import { AVAILABLE_STRATEGIES } from '@/lib/strategy-api'

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

function SignalBadge({ signal }: { signal: StrategySignal }) {
  const isCall = signal.signal_type === 'LONG_CALL'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
      isCall ? 'bg-success-gradient text-white' : 'bg-danger-gradient text-white'
    }`}>
      {isCall ? <TrendingUp className='h-3 w-3' /> : <TrendingDown className='h-3 w-3' />}
      {signal.signal_type.replace('_', ' ')}
    </span>
  )
}

function PnlBadge({ value }: { value: number | null }) {
  if (value === null) return <span className='text-xs text-muted-foreground'>—</span>
  const pos = value >= 0
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
      pos ? 'badge-success-modern' : 'badge-danger-modern'
    }`}>
      {pos ? <TrendingUp className='h-3 w-3' /> : <TrendingDown className='h-3 w-3' />}
      {fmtCurrency(Math.abs(value))}
    </span>
  )
}

export function StrategyDashboard() {
  const queryClient = useQueryClient()

  const configQ = useQuery({
    queryKey: ['strategy-config'],
    queryFn: strategyApi.getConfig,
    retry: false,
    staleTime: 0,
  })

  const signalsQ = useQuery({
    queryKey: ['strategy-signals'],
    queryFn: () => strategyApi.getSignals(20, false),
    retry: false,
    refetchInterval: 30_000,
  })

  const tradesQ = useQuery({
    queryKey: ['strategy-trades'],
    queryFn: () => strategyApi.getTrades(20, false),
    retry: false,
    refetchInterval: 30_000,
  })

  const statsQ = useQuery({
    queryKey: ['strategy-stats'],
    queryFn: strategyApi.getStats,
    retry: false,
  })

  const toggleStrategyMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      // Wait for config to load if not available
      let currentConfig = config
      if (!currentConfig) {
        const freshConfig = await strategyApi.getConfig()
        currentConfig = freshConfig
      }
      
      return strategyApi.updateConfig({
        is_enabled: enabled,
        version: currentConfig.version,
        symbols: currentConfig.symbols,
        start_time: currentConfig.start_time,
        end_time: currentConfig.end_time,
        alpha1_long_call_threshold: currentConfig.alpha1_long_call_threshold,
        alpha2_long_call_threshold: currentConfig.alpha2_long_call_threshold,
        alpha1_long_put_threshold: currentConfig.alpha1_long_put_threshold,
        alpha2_long_put_threshold: currentConfig.alpha2_long_put_threshold,
        min_option_price: currentConfig.min_option_price,
        stop_loss_percent: currentConfig.stop_loss_percent,
        trailing_stop_percent: currentConfig.trailing_stop_percent,
        default_quantity: currentConfig.default_quantity,
        max_positions: currentConfig.max_positions,
        send_signal_alerts: currentConfig.send_signal_alerts,
        send_trade_alerts: currentConfig.send_trade_alerts,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategy-config'] })
      toast.success('Strategy updated successfully')
    },
    onError: (error: any) => {
      console.error('Strategy update error:', error)
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to update strategy'
      toast.error(errorMessage)
    },
  })

  const config = configQ.data
  const signals = signalsQ.data ?? []
  const trades = tradesQ.data ?? []
  const stats = statsQ.data

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
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-xl font-bold tracking-tight text-gradient-emerald'>
              {config?.enabled_strategies && config.enabled_strategies.length > 1 
                ? 'Multi-Strategy Trading' 
                : 'Automated Strategy Trading'}
            </h1>
            <p className='text-xs text-muted-foreground mt-0.5'>
              {config?.enabled_strategies && config.enabled_strategies.length > 0 
                ? `Running ${config.enabled_strategies.length} ${config.enabled_strategies.length === 1 ? 'strategy' : 'strategies'}`
                : 'Options trading with automated signal generation'}
              {config?.symbols && config.symbols.length > 0 && (
                <span className='ml-2 text-primary font-semibold'>
                  • Monitoring: {config.symbols.join(', ')}
                </span>
              )}
            </p>
          </div>
          <div className='flex items-center gap-3'>
            <div className='flex items-center gap-2'>
              <Switch
                checked={config?.is_enabled ?? false}
                onCheckedChange={(checked) => toggleStrategyMutation.mutate(checked)}
                disabled={toggleStrategyMutation.isPending || configQ.isLoading || !config}
              />
              <Label className='text-xs font-semibold'>
                {configQ.isLoading ? 'Loading...' : config?.is_enabled ? 'Active' : 'Inactive'}
              </Label>
            </div>
            <StrategyConfigDialog config={config} />
          </div>
        </div>

        {configQ.isError && (
          <Alert className='bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'>
            <AlertCircle className='h-4 w-4 text-red-600' />
            <AlertTitle className='font-semibold text-red-900 dark:text-red-100'>Authentication Required</AlertTitle>
            <AlertDescription className='text-red-800 dark:text-red-200'>
              Please log in to access the strategy features. You need to be authenticated to view and manage trading strategies.
            </AlertDescription>
          </Alert>
        )}

        {!configQ.isError && !config?.is_enabled && (
          <Alert className='alert-emerald'>
            <AlertCircle className='h-4 w-4 icon-primary' />
            <AlertTitle className='font-semibold'>Strategy Inactive</AlertTitle>
            <AlertDescription>Enable the strategy to start receiving signals and executing trades</AlertDescription>
          </Alert>
        )}

        {/* Active Strategies */}
        {config && config.enabled_strategies && config.enabled_strategies.length > 0 && (
          <ActiveStrategiesCard 
            enabledStrategies={config.enabled_strategies}
            allocation={config.strategy_allocation || {}}
          />
        )}

        {/* Stats Grid */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
          <Card className='border-0 shadow-sm'>
            <CardContent className='p-3'>
              <div className='flex items-center justify-between mb-1.5'>
                <p className='text-[11px] font-medium text-muted-foreground'>Total Trades</p>
                <Activity className='h-3.5 w-3.5 icon-primary' />
              </div>
              {statsQ.isLoading ? <div className='skeleton-modern h-6 w-16' /> : <p className='text-base font-bold text-primary'>{stats?.total_trades ?? 0}</p>}
              <p className='text-[10px] text-muted-foreground mt-0.5'>All time</p>
            </CardContent>
          </Card>

          <Card className='border-0 shadow-sm'>
            <CardContent className='p-3'>
              <div className='flex items-center justify-between mb-1.5'>
                <p className='text-[11px] font-medium text-muted-foreground'>Win Rate</p>
                <TrendingUp className='h-3.5 w-3.5 icon-success' />
              </div>
              {statsQ.isLoading ? <div className='skeleton-modern h-6 w-16' /> : <p className='text-base font-bold text-success-compact'>{stats ? `${stats.win_rate.toFixed(1)}%` : '0%'}</p>}
              <p className='text-[10px] text-muted-foreground mt-0.5'>{stats?.winning_trades ?? 0} wins</p>
            </CardContent>
          </Card>

          <Card className='border-0 shadow-sm'>
            <CardContent className='p-3'>
              <div className='flex items-center justify-between mb-1.5'>
                <p className='text-[11px] font-medium text-muted-foreground'>Total P&L</p>
                {stats && stats.total_pnl >= 0 ? <TrendingUp className='h-3.5 w-3.5 icon-success' /> : <TrendingDown className='h-3.5 w-3.5 icon-danger' />}
              </div>
              {statsQ.isLoading ? <div className='skeleton-modern h-6 w-20' /> : <p className={`text-base font-bold ${stats && stats.total_pnl >= 0 ? 'text-success-compact' : 'text-danger-compact'}`}>{stats ? fmtCurrency(stats.total_pnl) : '₹0'}</p>}
              <p className='text-[10px] text-muted-foreground mt-0.5'>Net profit</p>
            </CardContent>
          </Card>

          <Card className='border-0 shadow-sm'>
            <CardContent className='p-3'>
              <div className='flex items-center justify-between mb-1.5'>
                <p className='text-[11px] font-medium text-muted-foreground'>Avg P&L</p>
                <BarChart2 className='h-3.5 w-3.5 icon-primary' />
              </div>
              {statsQ.isLoading ? <div className='skeleton-modern h-6 w-20' /> : <p className={`text-base font-bold ${stats && stats.avg_pnl >= 0 ? 'text-success-compact' : 'text-danger-compact'}`}>{stats ? fmtCurrency(stats.avg_pnl) : '₹0'}</p>}
              <p className='text-[10px] text-muted-foreground mt-0.5'>Per trade</p>
            </CardContent>
          </Card>
        </div>

        {/* Signal Strength & Active Trade */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          <SignalStrengthCard
            alpha1={signals[0]?.alpha1 ?? 0.5}
            alpha2={signals[0]?.alpha2 ?? 0.5}
            signalType={signals[0]?.signal_type ?? null}
            isLoading={signalsQ.isLoading}
          />
          <ActiveTradeCard
            trade={trades.find(t => t.status === 'OPEN') ?? null}
            isLoading={tradesQ.isLoading}
          />
        </div>

        {/* Signals & Trades */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          {/* Recent Signals */}
          <Card className='border-0 shadow-sm'>
            <CardHeader className='py-3 px-4'>
              <CardTitle className='text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide'>
                <Zap className='h-3.5 w-3.5 icon-warning' /> Recent Signals
                {signals.length > 0 && <span className='ml-auto normal-case font-normal'>{signals.length} signals</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className='p-0'>
              {signalsQ.isLoading ? (
                <div className='p-3 space-y-2'>{[...Array(3)].map((_, i) => <div key={i} className='skeleton-modern h-12 w-full' />)}</div>
              ) : signals.length === 0 ? (
                <div className='flex h-24 items-center justify-center text-xs text-muted-foreground'>No signals yet</div>
              ) : (
                <div className='max-h-80 overflow-y-auto scroll-modern'>
                  <Table className='table-modern-clean'>
                    <TableHeader>
                      <TableRow className='hover:bg-transparent'>
                        <TableHead className='pl-4 h-8 text-xs'>Time</TableHead>
                        <TableHead className='h-8 text-xs'>Signal</TableHead>
                        <TableHead className='text-right h-8 text-xs'>Strike</TableHead>
                        <TableHead className='text-right h-8 text-xs'>Alpha1</TableHead>
                        <TableHead className='text-right pr-4 h-8 text-xs'>Alpha2</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {signals.map((signal) => (
                        <TableRow key={signal.id} className='hover:bg-muted/30'>
                          <TableCell className='pl-4 py-2 text-xs font-mono'>{fmtTime(signal.signal_time)}</TableCell>
                          <TableCell className='py-2'><SignalBadge signal={signal} /></TableCell>
                          <TableCell className='text-right py-2 text-xs font-semibold'>{signal.strike_price} {signal.option_type}</TableCell>
                          <TableCell className='text-right py-2 text-xs font-mono'>{signal.alpha1.toFixed(2)}</TableCell>
                          <TableCell className='text-right pr-4 py-2 text-xs font-mono'>{signal.alpha2.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Trades */}
          <Card className='border-0 shadow-sm'>
            <CardHeader className='py-3 px-4'>
              <CardTitle className='text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide'>
                <Activity className='h-3.5 w-3.5 icon-accent' /> Recent Trades
                {trades.length > 0 && <span className='ml-auto normal-case font-normal'>{trades.length} trades</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className='p-0'>
              {tradesQ.isLoading ? (
                <div className='p-3 space-y-2'>{[...Array(3)].map((_, i) => <div key={i} className='skeleton-modern h-12 w-full' />)}</div>
              ) : trades.length === 0 ? (
                <div className='flex h-24 items-center justify-center text-xs text-muted-foreground'>No trades yet</div>
              ) : (
                <div className='max-h-80 overflow-y-auto scroll-modern'>
                  <Table className='table-modern-clean'>
                    <TableHeader>
                      <TableRow className='hover:bg-transparent'>
                        <TableHead className='pl-4 h-8 text-xs'>Entry</TableHead>
                        <TableHead className='h-8 text-xs'>Type</TableHead>
                        <TableHead className='text-right h-8 text-xs'>Strike</TableHead>
                        <TableHead className='text-right h-8 text-xs'>Status</TableHead>
                        <TableHead className='text-right pr-4 h-8 text-xs'>P&L</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trades.map((trade) => (
                        <TableRow key={trade.id} className='hover:bg-muted/30'>
                          <TableCell className='pl-4 py-2 text-xs font-mono'>{fmtTime(trade.entry_time)}</TableCell>
                          <TableCell className='py-2 text-xs font-semibold'>{trade.trade_type.replace('_', ' ')}</TableCell>
                          <TableCell className='text-right py-2 text-xs font-semibold'>{trade.strike_price} {trade.option_type}</TableCell>
                          <TableCell className='text-right py-2'>
                            <span className={`text-xs font-semibold ${trade.status === 'OPEN' ? 'text-primary' : 'text-muted-foreground'}`}>
                              {trade.status}
                            </span>
                          </TableCell>
                          <TableCell className='text-right pr-4 py-2'><PnlBadge value={trade.pnl} /></TableCell>
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
