import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings, Save } from 'lucide-react'
import { toast } from 'sonner'
import { strategyApi, type StrategyConfig, type StrategyType } from '@/lib/strategy-api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StrategySelector } from './strategy-selector'

interface StrategyConfigDialogProps {
  config: StrategyConfig | undefined
}

export function StrategyConfigDialog({ config }: StrategyConfigDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    version: config?.version ?? 'regular',
    symbols: config?.symbols ?? ['NIFTY', 'SENSEX'],
    enabled_strategies: (config?.enabled_strategies ?? ['skew_hunter']) as StrategyType[],
    strategy_allocation: config?.strategy_allocation ?? ({ skew_hunter: 100 } as Record<StrategyType, number>),
    start_time: config?.start_time ?? '10:15',
    end_time: config?.end_time ?? '14:15',
    alpha1_long_call_threshold: config?.alpha1_long_call_threshold ?? 0.75,
    alpha2_long_call_threshold: config?.alpha2_long_call_threshold ?? 0.8,
    alpha1_long_put_threshold: config?.alpha1_long_put_threshold ?? 0.25,
    alpha2_long_put_threshold: config?.alpha2_long_put_threshold ?? 0.2,
    min_option_price: config?.min_option_price ?? 20,
    stop_loss_percent: config?.stop_loss_percent ?? 40,
    trailing_stop_percent: config?.trailing_stop_percent ?? 30,
    default_quantity: config?.default_quantity ?? 1,
    max_positions: config?.max_positions ?? 1,
    send_signal_alerts: config?.send_signal_alerts ?? true,
    send_trade_alerts: config?.send_trade_alerts ?? true,
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<StrategyConfig>) => strategyApi.updateConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategy-config'] })
      toast.success('Configuration saved')
      setOpen(false)
    },
    onError: () => {
      toast.error('Failed to save configuration')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate(formData)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size='sm' variant='outline' className='h-8 text-xs'>
          <Settings className='h-3 w-3 mr-1' />
          Configure
        </Button>
      </DialogTrigger>
      <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Strategy Configuration</DialogTitle>
          <DialogDescription>
            Configure your trading strategies and parameters
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="strategies" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="strategies">Strategies</TabsTrigger>
              <TabsTrigger value="parameters">Parameters</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>

            <TabsContent value="strategies" className="space-y-4 py-4">
              <StrategySelector
                selectedStrategies={formData.enabled_strategies}
                allocation={formData.strategy_allocation}
                onSelectionChange={(strategies) => setFormData({ ...formData, enabled_strategies: strategies })}
                onAllocationChange={(allocation) => setFormData({ ...formData, strategy_allocation: allocation })}
              />
            </TabsContent>

            <TabsContent value="parameters" className="space-y-6 py-4">
              {/* Strategy Version */}
              <div className='space-y-2'>
                <Label>Strategy Version</Label>
                <Select value={formData.version} onValueChange={(value) => setFormData({ ...formData, version: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='regular'>Regular (Fixed Stop Loss)</SelectItem>
                    <SelectItem value='tsl'>TSL (Trailing Stop Loss)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Symbols to Monitor */}
              <div className='space-y-2'>
                <Label>Symbols to Monitor</Label>
                <div className='flex gap-3'>
                  <div className='flex items-center gap-2'>
                    <Switch
                      checked={formData.symbols.includes('NIFTY')}
                      onCheckedChange={(checked) => {
                        const newSymbols = checked
                          ? [...formData.symbols, 'NIFTY']
                          : formData.symbols.filter(s => s !== 'NIFTY')
                        setFormData({ ...formData, symbols: newSymbols })
                      }}
                    />
                    <Label className='text-sm font-semibold'>NIFTY</Label>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Switch
                      checked={formData.symbols.includes('SENSEX')}
                      onCheckedChange={(checked) => {
                        const newSymbols = checked
                          ? [...formData.symbols, 'SENSEX']
                          : formData.symbols.filter(s => s !== 'SENSEX')
                        setFormData({ ...formData, symbols: newSymbols })
                      }}
                    />
                    <Label className='text-sm font-semibold'>SENSEX</Label>
                  </div>
                </div>
              </div>

              {/* Trading Hours */}
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label>Start Time</Label>
                  <Input
                    type='time'
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>
                <div className='space-y-2'>
                  <Label>End Time</Label>
                  <Input
                    type='time'
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
              </div>

              {/* Alpha Thresholds */}
              <div className='space-y-4'>
                <h3 className='text-sm font-semibold'>Signal Thresholds</h3>
                
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label>Alpha1 Long Call (&gt;)</Label>
                    <Input
                      type='number'
                      step='0.01'
                      min='0'
                      max='1'
                      value={formData.alpha1_long_call_threshold}
                      onChange={(e) => setFormData({ ...formData, alpha1_long_call_threshold: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label>Alpha2 Long Call (&gt;)</Label>
                    <Input
                      type='number'
                      step='0.01'
                      min='0'
                      max='1'
                      value={formData.alpha2_long_call_threshold}
                      onChange={(e) => setFormData({ ...formData, alpha2_long_call_threshold: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label>Alpha1 Long Put (&lt;)</Label>
                    <Input
                      type='number'
                      step='0.01'
                      min='0'
                      max='1'
                      value={formData.alpha1_long_put_threshold}
                      onChange={(e) => setFormData({ ...formData, alpha1_long_put_threshold: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label>Alpha2 Long Put (&lt;)</Label>
                    <Input
                      type='number'
                      step='0.01'
                      min='0'
                      max='1'
                      value={formData.alpha2_long_put_threshold}
                      onChange={(e) => setFormData({ ...formData, alpha2_long_put_threshold: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* Risk Management */}
              <div className='space-y-4'>
                <h3 className='text-sm font-semibold'>Risk Management</h3>
                
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label>Min Option Price</Label>
                    <Input
                      type='number'
                      min='0'
                      value={formData.min_option_price}
                      onChange={(e) => setFormData({ ...formData, min_option_price: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label>Stop Loss %</Label>
                    <Input
                      type='number'
                      min='0'
                      max='100'
                      value={formData.stop_loss_percent}
                      onChange={(e) => setFormData({ ...formData, stop_loss_percent: parseFloat(e.target.value) })}
                    />
                  </div>
                  {formData.version === 'tsl' && (
                    <div className='space-y-2'>
                      <Label>Trailing Stop %</Label>
                      <Input
                        type='number'
                        min='0'
                        max='100'
                        value={formData.trailing_stop_percent}
                        onChange={(e) => setFormData({ ...formData, trailing_stop_percent: parseFloat(e.target.value) })}
                      />
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="signal-alerts">Signal Alerts</Label>
                <Switch
                  id="signal-alerts"
                  checked={formData.send_signal_alerts}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, send_signal_alerts: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="trade-alerts">Trade Alerts</Label>
                <Switch
                  id="trade-alerts"
                  checked={formData.send_trade_alerts}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, send_trade_alerts: checked })
                  }
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type='button' variant='outline' onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type='submit' disabled={updateMutation.isPending} className='bg-primary-gradient'>
              <Save className='h-3 w-3 mr-1' />
              {updateMutation.isPending ? 'Saving...' : 'Save Configuration'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
