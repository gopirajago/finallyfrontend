interface AlphaMeterProps {
  value: number
  label: string
  type: 'call' | 'put'
}

export function AlphaMeter({ value, label, type }: AlphaMeterProps) {
  // Determine color based on value and type
  const getColor = () => {
    if (type === 'call') {
      // For calls: green when high (>0.75), red when low
      if (value >= 0.75) return 'bg-success-gradient'
      if (value <= 0.25) return 'bg-danger-gradient'
      return 'bg-gray-300 dark:bg-gray-700'
    } else {
      // For puts: green when low (<0.25), red when high
      if (value <= 0.25) return 'bg-success-gradient'
      if (value >= 0.75) return 'bg-danger-gradient'
      return 'bg-gray-300 dark:bg-gray-700'
    }
  }

  const getSignalZone = () => {
    if (type === 'call') {
      if (value >= 0.75) return 'LONG CALL ZONE'
      if (value <= 0.25) return 'LONG PUT ZONE'
      return 'NEUTRAL'
    } else {
      if (value <= 0.25) return 'LONG PUT ZONE'
      if (value >= 0.75) return 'LONG CALL ZONE'
      return 'NEUTRAL'
    }
  }

  const percentage = value * 100

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between'>
        <span className='text-xs font-semibold text-muted-foreground'>{label}</span>
        <span className='text-xs font-bold font-mono'>{value.toFixed(3)}</span>
      </div>
      
      {/* Meter bar */}
      <div className='relative h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden'>
        <div
          className={`h-full transition-all duration-500 ${getColor()}`}
          style={{ width: `${percentage}%` }}
        />
        
        {/* Threshold markers */}
        <div className='absolute inset-0 flex items-center'>
          <div className='absolute left-[25%] w-0.5 h-full bg-white/50' />
          <div className='absolute left-[75%] w-0.5 h-full bg-white/50' />
        </div>
      </div>
      
      {/* Signal zone indicator */}
      <div className='text-center'>
        <span className={`text-[10px] font-bold ${
          getSignalZone().includes('CALL') ? 'text-success-compact' :
          getSignalZone().includes('PUT') ? 'text-danger-compact' :
          'text-muted-foreground'
        }`}>
          {getSignalZone()}
        </span>
      </div>
    </div>
  )
}
