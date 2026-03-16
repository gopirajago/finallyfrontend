import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AVAILABLE_STRATEGIES, type StrategyType } from '@/lib/strategy-api'
import { Activity } from 'lucide-react'

interface ActiveStrategiesCardProps {
  enabledStrategies: StrategyType[]
  allocation: Record<StrategyType, number>
}

export function ActiveStrategiesCard({ enabledStrategies, allocation }: ActiveStrategiesCardProps) {
  const getStrategyInfo = (type: StrategyType) => {
    return AVAILABLE_STRATEGIES.find(s => s.type === type)
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Low': return 'bg-green-500/10 text-green-500'
      case 'Medium': return 'bg-yellow-500/10 text-yellow-500'
      case 'High': return 'bg-red-500/10 text-red-500'
      default: return 'bg-gray-500/10 text-gray-500'
    }
  }

  if (enabledStrategies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Active Strategies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No strategies enabled. Configure strategies to start trading.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Active Strategies ({enabledStrategies.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {enabledStrategies.map((strategyType) => {
            const info = getStrategyInfo(strategyType)
            const alloc = allocation[strategyType] || 0
            
            if (!info) return null

            return (
              <div
                key={strategyType}
                className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-semibold">{info.name}</h4>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                    {alloc}%
                  </Badge>
                </div>
                
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                    {info.winRate}
                  </Badge>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${getRiskColor(info.riskLevel)}`}>
                    {info.riskLevel}
                  </Badge>
                </div>

                <p className="text-[10px] text-muted-foreground line-clamp-2">
                  {info.description}
                </p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
