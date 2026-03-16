import { Check } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AVAILABLE_STRATEGIES, type StrategyType } from '@/lib/strategy-api'

interface StrategySelectionProps {
  selectedStrategies: StrategyType[]
  allocation: Record<StrategyType, number>
  onSelectionChange: (strategies: StrategyType[]) => void
  onAllocationChange: (allocation: Record<StrategyType, number>) => void
}

export function StrategySelector({
  selectedStrategies,
  allocation,
  onSelectionChange,
  onAllocationChange
}: StrategySelectionProps) {
  const toggleStrategy = (strategyType: StrategyType) => {
    if (selectedStrategies.includes(strategyType)) {
      onSelectionChange(selectedStrategies.filter(s => s !== strategyType))
    } else {
      onSelectionChange([...selectedStrategies, strategyType])
    }
  }

  const updateAllocation = (strategyType: StrategyType, value: number) => {
    onAllocationChange({
      ...allocation,
      [strategyType]: value
    })
  }

  const totalAllocation = Object.values(allocation).reduce((sum, val) => sum + val, 0)

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Low': return 'bg-green-500/10 text-green-500'
      case 'Medium': return 'bg-yellow-500/10 text-yellow-500'
      case 'High': return 'bg-red-500/10 text-red-500'
      default: return 'bg-gray-500/10 text-gray-500'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Select Trading Strategies</h3>
        <div className="text-sm">
          Total Allocation: <span className={totalAllocation > 100 ? 'text-red-500 font-bold' : 'font-semibold'}>{totalAllocation}%</span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {AVAILABLE_STRATEGIES.map((strategy) => {
          const isSelected = selectedStrategies.includes(strategy.type)
          const currentAllocation = allocation[strategy.type] || 0

          return (
            <Card
              key={strategy.type}
              className={`p-3 cursor-pointer transition-all ${
                isSelected ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-gray-300'
              }`}
              onClick={() => toggleStrategy(strategy.type)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold">{strategy.name}</h4>
                    {isSelected && <Check className="h-3 w-3 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground mb-1.5">{strategy.description}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-2">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                  {strategy.winRate}
                </Badge>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${getRiskColor(strategy.riskLevel)}`}>
                  {strategy.riskLevel}
                </Badge>
              </div>

              <div className="text-[10px] text-muted-foreground mb-2">
                <strong>Best for:</strong> {strategy.bestFor}
              </div>

              {isSelected && (
                <div className="pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium">Allocation</label>
                    <span className="text-xs font-semibold">{currentAllocation}%</span>
                  </div>
                  <input
                    type="range"
                    value={currentAllocation}
                    onChange={(e) => updateAllocation(strategy.type, parseInt(e.target.value))}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {totalAllocation > 100 && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-sm text-red-500">
          ⚠️ Total allocation exceeds 100%. Please adjust the allocations.
        </div>
      )}

      {selectedStrategies.length === 0 && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-sm text-yellow-600">
          ℹ️ Select at least one strategy to start trading.
        </div>
      )}
    </div>
  )
}
