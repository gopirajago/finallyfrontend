import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react'
import type { TechnicalIndicators } from '@/lib/strategy-api'

interface TechnicalIndicatorsCardProps {
  indicators: TechnicalIndicators
  signal?: 'bullish' | 'bearish' | 'neutral'
  currentPrice?: number
}

export function TechnicalIndicatorsCard({ indicators, signal, currentPrice }: TechnicalIndicatorsCardProps) {
  const getRSIColor = (rsi?: number) => {
    if (!rsi) return 'text-muted-foreground'
    if (rsi < 30) return 'text-green-500'
    if (rsi > 70) return 'text-red-500'
    return 'text-blue-500'
  }

  const getRSILabel = (rsi?: number) => {
    if (!rsi) return 'N/A'
    if (rsi < 30) return 'Oversold'
    if (rsi > 70) return 'Overbought'
    return 'Neutral'
  }

  const getSignalColor = () => {
    if (signal === 'bullish') return 'bg-green-500/10 text-green-500 border-green-500/20'
    if (signal === 'bearish') return 'bg-red-500/10 text-red-500 border-red-500/20'
    return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Technical Indicators
          </div>
          {signal && (
            <Badge variant="outline" className={`text-xs font-semibold capitalize ${getSignalColor()}`}>
              {signal}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* RSI */}
        {indicators.rsi !== undefined && (
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">RSI (14)</span>
              <span className={`text-xs font-semibold ${getRSIColor(indicators.rsi)}`}>
                {indicators.rsi.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="w-full bg-gray-200 rounded-full h-1.5 mr-2">
                <div
                  className={`h-1.5 rounded-full ${getRSIColor(indicators.rsi).replace('text-', 'bg-')}`}
                  style={{ width: `${Math.min(indicators.rsi, 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {getRSILabel(indicators.rsi)}
              </span>
            </div>
          </div>
        )}

        {/* MACD */}
        {indicators.macd !== undefined && indicators.macd_signal !== undefined && (
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">MACD</span>
              {indicators.macd > indicators.macd_signal ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="text-muted-foreground">Line: </span>
                <span className="font-semibold">{indicators.macd.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Signal: </span>
                <span className="font-semibold">{indicators.macd_signal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Moving Averages */}
        {(indicators.sma_20 || indicators.sma_50) && (
          <div className="p-2 rounded-lg bg-muted/50">
            <span className="text-xs text-muted-foreground block mb-1">Moving Averages</span>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              {indicators.sma_20 && (
                <div>
                  <span className="text-muted-foreground">SMA 20: </span>
                  <span className="font-semibold">₹{indicators.sma_20.toFixed(0)}</span>
                </div>
              )}
              {indicators.sma_50 && (
                <div>
                  <span className="text-muted-foreground">SMA 50: </span>
                  <span className="font-semibold">₹{indicators.sma_50.toFixed(0)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bollinger Bands */}
        {indicators.bb_upper && indicators.bb_lower && currentPrice && (
          <div className="p-2 rounded-lg bg-muted/50">
            <span className="text-xs text-muted-foreground block mb-1">Bollinger Bands</span>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Upper:</span>
                <span className="font-semibold">₹{indicators.bb_upper.toFixed(0)}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Current:</span>
                <span className="font-semibold text-primary">₹{currentPrice.toFixed(0)}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Lower:</span>
                <span className="font-semibold">₹{indicators.bb_lower.toFixed(0)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Support/Resistance */}
        {(indicators.support || indicators.resistance) && (
          <div className="p-2 rounded-lg bg-muted/50">
            <span className="text-xs text-muted-foreground block mb-1">Key Levels</span>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              {indicators.resistance && (
                <div>
                  <span className="text-muted-foreground">Resistance: </span>
                  <span className="font-semibold text-red-500">₹{indicators.resistance.toFixed(0)}</span>
                </div>
              )}
              {indicators.support && (
                <div>
                  <span className="text-muted-foreground">Support: </span>
                  <span className="font-semibold text-green-500">₹{indicators.support.toFixed(0)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
