import { TrendingUp, TrendingDown, AlertTriangle, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type StrategyTrade } from '@/lib/strategy-api'

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

interface ActiveTradeCardProps {
  trade: StrategyTrade | null
  isLoading?: boolean
}

export function ActiveTradeCard({ trade, isLoading }: ActiveTradeCardProps) {
  if (isLoading) {
    return (
      <Card className='border-0 shadow-sm'>
        <CardHeader className='py-3 px-4'>
          <CardTitle className='text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide'>
            <Clock className='h-3.5 w-3.5 icon-primary' /> Active Trade
          </CardTitle>
        </CardHeader>
        <CardContent className='p-4'>
          <div className='skeleton-modern h-32 w-full' />
        </CardContent>
      </Card>
    )
  }

  if (!trade) {
    return (
      <Card className='border-0 shadow-sm'>
        <CardHeader className='py-3 px-4'>
          <CardTitle className='text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide'>
            <Clock className='h-3.5 w-3.5 icon-primary' /> Active Trade
          </CardTitle>
        </CardHeader>
        <CardContent className='p-4'>
          <div className='flex flex-col items-center justify-center h-32 text-center'>
            <AlertTriangle className='h-8 w-8 text-muted-foreground mb-2' />
            <p className='text-sm text-muted-foreground'>No active trade</p>
            <p className='text-xs text-muted-foreground mt-1'>Waiting for signal...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isCall = trade.trade_type === 'LONG_CALL'
  const pnl = trade.pnl ?? 0
  const pnlPercent = trade.pnl_percent ?? 0

  return (
    <Card className='border-0 shadow-sm'>
      <CardHeader className='py-3 px-4'>
        <CardTitle className='text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide'>
          <Clock className='h-3.5 w-3.5 icon-primary' /> Active Trade
          <span className='ml-auto normal-case font-normal text-primary'>LIVE</span>
        </CardTitle>
      </CardHeader>
      <CardContent className='p-4 space-y-4'>
        {/* Trade Type */}
        <div className='flex items-center justify-between'>
          <span className='text-xs text-muted-foreground'>Position</span>
          <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-sm ${
            isCall ? 'bg-success-gradient text-white' : 'bg-danger-gradient text-white'
          }`}>
            {isCall ? <TrendingUp className='h-4 w-4' /> : <TrendingDown className='h-4 w-4' />}
            {trade.trade_type.replace('_', ' ')}
          </div>
        </div>

        {/* Strike & Option Type */}
        <div className='grid grid-cols-2 gap-3'>
          <div>
            <div className='text-xs text-muted-foreground mb-1'>Strike</div>
            <div className='text-lg font-bold'>{trade.strike_price}</div>
          </div>
          <div>
            <div className='text-xs text-muted-foreground mb-1'>Type</div>
            <div className='text-lg font-bold'>{trade.option_type}</div>
          </div>
        </div>

        {/* Entry Details */}
        <div className='p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700'>
          <div className='grid grid-cols-2 gap-3 text-xs'>
            <div>
              <div className='text-muted-foreground mb-1'>Entry Price</div>
              <div className='font-bold'>{fmtCurrency(trade.entry_price)}</div>
            </div>
            <div>
              <div className='text-muted-foreground mb-1'>Entry Time</div>
              <div className='font-mono'>{fmtTime(trade.entry_time)}</div>
            </div>
            <div>
              <div className='text-muted-foreground mb-1'>Quantity</div>
              <div className='font-bold'>{trade.quantity} lots</div>
            </div>
            <div>
              <div className='text-muted-foreground mb-1'>Stop Loss</div>
              <div className='font-bold text-danger-compact'>{fmtCurrency(trade.stop_loss_price)}</div>
            </div>
          </div>
        </div>

        {/* P&L */}
        <div className='p-4 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-700'>
          <div className='text-xs text-muted-foreground mb-2 text-center'>Current P&L</div>
          <div className={`text-3xl font-bold text-center ${pnl >= 0 ? 'text-success-compact' : 'text-danger-compact'}`}>
            {pnl >= 0 ? '+' : ''}{fmtCurrency(pnl)}
          </div>
          <div className={`text-sm font-semibold text-center mt-1 ${pnlPercent >= 0 ? 'text-success-compact' : 'text-danger-compact'}`}>
            {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
          </div>
        </div>

        {/* Strategy Version */}
        <div className='flex items-center justify-between text-xs'>
          <span className='text-muted-foreground'>Strategy</span>
          <span className='font-semibold'>{trade.strategy_version.toUpperCase()}</span>
        </div>
      </CardContent>
    </Card>
  )
}
