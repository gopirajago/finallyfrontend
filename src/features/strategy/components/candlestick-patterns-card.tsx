import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'

interface CandlestickPatternsCardProps {
  patterns: string[]
  signal: 'bullish' | 'bearish' | 'neutral'
  confidence?: number
}

export function CandlestickPatternsCard({ patterns, signal, confidence = 0 }: CandlestickPatternsCardProps) {
  const getSignalIcon = () => {
    if (signal === 'bullish') return <TrendingUp className="h-4 w-4 text-green-500" />
    if (signal === 'bearish') return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Activity className="h-4 w-4 text-gray-500" />
  }

  const getSignalColor = () => {
    if (signal === 'bullish') return 'bg-green-500/10 text-green-500 border-green-500/20'
    if (signal === 'bearish') return 'bg-red-500/10 text-red-500 border-red-500/20'
    return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
  }

  const formatPatternName = (pattern: string) => {
    return pattern
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  if (!patterns || patterns.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4" />
            Candlestick Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">No patterns detected</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Candlestick Patterns
          </div>
          {getSignalIcon()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Signal</span>
          <Badge variant="outline" className={`text-xs font-semibold capitalize ${getSignalColor()}`}>
            {signal}
          </Badge>
        </div>

        {confidence > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Confidence</span>
            <span className="text-xs font-semibold">{(confidence * 100).toFixed(0)}%</span>
          </div>
        )}

        <div>
          <p className="text-xs text-muted-foreground mb-2">Detected Patterns:</p>
          <div className="flex flex-wrap gap-1.5">
            {patterns.map((pattern, index) => (
              <Badge key={index} variant="outline" className="text-[10px] px-2 py-0.5">
                {formatPatternName(pattern)}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
