import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Activity, BarChart3, Gauge } from 'lucide-react'

interface MarketDataCardProps {
  vix?: number
  spotPrice?: number
  symbol: string
  trend?: 'bullish' | 'bearish' | 'neutral'
  volatility?: 'low' | 'medium' | 'high'
  priceChange?: number
  priceChangePercent?: number
}

export function MarketDataCard({ 
  vix, 
  spotPrice, 
  symbol,
  trend = 'neutral',
  volatility = 'medium',
  priceChange = 0,
  priceChangePercent = 0
}: MarketDataCardProps) {
  const getVolatilityColor = (vol: string) => {
    switch (vol) {
      case 'low': return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      case 'high': return 'bg-red-500/10 text-red-500 border-red-500/20'
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  const getTrendIcon = () => {
    if (trend === 'bullish') return <TrendingUp className="h-4 w-4 text-green-500" />
    if (trend === 'bearish') return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Activity className="h-4 w-4 text-gray-500" />
  }

  const getVixLevel = (vixValue?: number) => {
    if (!vixValue) return 'Unknown'
    if (vixValue < 15) return 'Low'
    if (vixValue < 20) return 'Normal'
    if (vixValue < 30) return 'High'
    return 'Very High'
  }

  const getVixColor = (vixValue?: number) => {
    if (!vixValue) return 'text-muted-foreground'
    if (vixValue < 15) return 'text-green-500'
    if (vixValue < 20) return 'text-blue-500'
    if (vixValue < 30) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="text-base font-semibold">{symbol} Market Data</span>
          </div>
          {getTrendIcon()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Spot Price */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Spot Price</p>
            <p className="text-2xl font-bold">
              {spotPrice ? `₹${spotPrice.toLocaleString('en-IN')}` : '—'}
            </p>
            {priceChange !== 0 && (
              <div className={`flex items-center gap-1 text-xs font-semibold ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {priceChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
              </div>
            )}
          </div>
        </div>

        {/* VIX */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">India VIX</p>
            </div>
            <p className={`text-xl font-bold ${getVixColor(vix)}`}>
              {vix ? vix.toFixed(2) : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {getVixLevel(vix)}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Volatility</p>
            </div>
            <Badge variant="outline" className={`${getVolatilityColor(volatility)} text-xs font-semibold capitalize`}>
              {volatility}
            </Badge>
            <p className="text-[10px] text-muted-foreground mt-1">
              {volatility === 'low' && 'Favor Iron Condor'}
              {volatility === 'medium' && 'Balanced strategies'}
              {volatility === 'high' && 'Favor Straddle'}
            </p>
          </div>
        </div>

        {/* Market Regime */}
        <div className="p-3 rounded-lg border bg-card">
          <p className="text-xs text-muted-foreground mb-2">Recommended Strategies</p>
          <div className="flex flex-wrap gap-1.5">
            {volatility === 'low' && (
              <>
                <Badge variant="outline" className="text-[10px] px-2 py-0.5">Iron Condor</Badge>
                <Badge variant="outline" className="text-[10px] px-2 py-0.5">Calendar Spread</Badge>
              </>
            )}
            {volatility === 'medium' && (
              <>
                <Badge variant="outline" className="text-[10px] px-2 py-0.5">Skew Hunter</Badge>
                <Badge variant="outline" className="text-[10px] px-2 py-0.5">Bull/Bear Spread</Badge>
              </>
            )}
            {volatility === 'high' && (
              <>
                <Badge variant="outline" className="text-[10px] px-2 py-0.5">Straddle</Badge>
                <Badge variant="outline" className="text-[10px] px-2 py-0.5">Strangle</Badge>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
