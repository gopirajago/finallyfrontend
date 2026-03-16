import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

interface ClaudeAnalysisCardProps {
  validated: boolean
  confidence: number
  reasoning: string
  risks?: string
  recommendation?: string
}

export function ClaudeAnalysisCard({ 
  validated, 
  confidence, 
  reasoning, 
  risks,
  recommendation 
}: ClaudeAnalysisCardProps) {
  const getValidationIcon = () => {
    if (validated) return <CheckCircle2 className="h-4 w-4 text-green-500" />
    return <XCircle className="h-4 w-4 text-red-500" />
  }

  const getValidationColor = () => {
    if (validated) return 'bg-green-500/10 text-green-500 border-green-500/20'
    return 'bg-red-500/10 text-red-500 border-red-500/20'
  }

  const getConfidenceColor = () => {
    if (confidence >= 0.7) return 'text-green-500'
    if (confidence >= 0.5) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getRecommendationColor = () => {
    if (recommendation === 'BUY') return 'bg-green-500/10 text-green-500 border-green-500/20'
    if (recommendation === 'AVOID') return 'bg-red-500/10 text-red-500 border-red-500/20'
    return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            Claude AI Analysis
          </div>
          {getValidationIcon()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Validation Status */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Validation</span>
          <Badge variant="outline" className={`text-xs font-semibold ${getValidationColor()}`}>
            {validated ? 'AGREE' : 'DISAGREE'}
          </Badge>
        </div>

        {/* Confidence Score */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Confidence</span>
          <span className={`text-sm font-bold ${getConfidenceColor()}`}>
            {(confidence * 100).toFixed(0)}%
          </span>
        </div>

        {/* Confidence Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${getConfidenceColor().replace('text-', 'bg-')}`}
            style={{ width: `${confidence * 100}%` }}
          />
        </div>

        {/* Recommendation */}
        {recommendation && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Recommendation</span>
            <Badge variant="outline" className={`text-xs font-semibold ${getRecommendationColor()}`}>
              {recommendation}
            </Badge>
          </div>
        )}

        {/* Reasoning */}
        {reasoning && (
          <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
            <p className="text-xs text-muted-foreground mb-1 font-semibold">Analysis:</p>
            <p className="text-xs leading-relaxed">{reasoning}</p>
          </div>
        )}

        {/* Risks */}
        {risks && (
          <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground mb-1 font-semibold">Risks:</p>
                <p className="text-xs leading-relaxed">{risks}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
