import { TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlphaMeter } from './alpha-meter'

interface SignalStrengthCardProps {
  alpha1: number
  alpha2: number
  signalType: string | null
  isLoading?: boolean
}

export function SignalStrengthCard({ alpha1, alpha2, signalType, isLoading }: SignalStrengthCardProps) {
  const signalStrength = (alpha1 + alpha2) / 2

  return (
    <Card className='border-0 shadow-sm'>
      <CardHeader className='py-3 px-4'>
        <CardTitle className='text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide'>
          <Activity className='h-3.5 w-3.5 icon-primary' /> Signal Strength
        </CardTitle>
      </CardHeader>
      <CardContent className='p-4 space-y-4'>
        {isLoading ? (
          <div className='space-y-3'>
            <div className='skeleton-modern h-12 w-full' />
            <div className='skeleton-modern h-12 w-full' />
            <div className='skeleton-modern h-12 w-full' />
          </div>
        ) : (
          <>
            {/* Current Signal */}
            <div className='p-3 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-700'>
              <div className='flex items-center justify-between mb-2'>
                <span className='text-xs font-semibold text-muted-foreground'>Current Signal</span>
                {signalType && (
                  signalType === 'LONG_CALL' ? 
                    <TrendingUp className='h-4 w-4 text-success-compact' /> :
                    <TrendingDown className='h-4 w-4 text-danger-compact' />
                )}
              </div>
              <div className='text-center'>
                {signalType ? (
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm ${
                    signalType === 'LONG_CALL' ? 'bg-success-gradient text-white' : 'bg-danger-gradient text-white'
                  }`}>
                    {signalType === 'LONG_CALL' ? <TrendingUp className='h-4 w-4' /> : <TrendingDown className='h-4 w-4' />}
                    {signalType.replace('_', ' ')}
                  </div>
                ) : (
                  <span className='text-sm text-muted-foreground'>No active signal</span>
                )}
              </div>
              {signalType && (
                <div className='mt-3 text-center'>
                  <div className='text-xs text-muted-foreground mb-1'>Strength</div>
                  <div className='text-2xl font-bold'>{(signalStrength * 100).toFixed(1)}%</div>
                </div>
              )}
            </div>

            {/* Alpha Meters */}
            <div className='space-y-4'>
              <AlphaMeter
                value={alpha1}
                label='Alpha 1 (Volume + OI)'
                type={alpha1 >= 0.5 ? 'call' : 'put'}
              />
              
              <AlphaMeter
                value={alpha2}
                label='Alpha 2 (IV Skew)'
                type={alpha2 >= 0.5 ? 'call' : 'put'}
              />
            </div>

            {/* Thresholds Info */}
            <div className='p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700'>
              <div className='text-xs font-semibold text-muted-foreground mb-2'>Signal Thresholds</div>
              <div className='grid grid-cols-2 gap-2 text-[10px]'>
                <div>
                  <div className='font-semibold text-success-compact'>Long Call:</div>
                  <div className='text-muted-foreground'>α1 &gt; 0.75 & α2 &gt; 0.80</div>
                </div>
                <div>
                  <div className='font-semibold text-danger-compact'>Long Put:</div>
                  <div className='text-muted-foreground'>α1 &lt; 0.25 & α2 &lt; 0.20</div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
