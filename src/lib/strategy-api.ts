import { apiClient } from './api-client'

export type StrategyType = 
  | 'skew_hunter'
  | 'iron_condor'
  | 'straddle'
  | 'strangle'
  | 'bull_call_spread'
  | 'bear_put_spread'
  | 'calendar_spread'
  | 'ratio_spread'

export interface StrategyInfo {
  type: StrategyType
  name: string
  description: string
  winRate: string
  bestFor: string
  riskLevel: 'Low' | 'Medium' | 'High'
}

export const AVAILABLE_STRATEGIES: StrategyInfo[] = [
  {
    type: 'skew_hunter',
    name: 'Skew Hunter',
    description: 'Directional strategy exploiting IV skew and volume patterns',
    winRate: '60-70%',
    bestFor: 'Trending markets',
    riskLevel: 'Medium'
  },
  {
    type: 'iron_condor',
    name: 'Iron Condor',
    description: 'Sell OTM call spread + OTM put spread for range-bound markets',
    winRate: '70-80%',
    bestFor: 'Low volatility, sideways markets',
    riskLevel: 'Low'
  },
  {
    type: 'straddle',
    name: 'Straddle',
    description: 'Buy ATM call + put for big moves in either direction',
    winRate: '50-60%',
    bestFor: 'High volatility events (RBI policy, budget)',
    riskLevel: 'Medium'
  },
  {
    type: 'strangle',
    name: 'Strangle',
    description: 'Buy OTM call + put (cheaper version of straddle)',
    winRate: '50-60%',
    bestFor: 'High volatility events with lower cost',
    riskLevel: 'Medium'
  },
  {
    type: 'bull_call_spread',
    name: 'Bull Call Spread',
    description: 'Buy ITM call + Sell OTM call for moderate bullish view',
    winRate: '65-75%',
    bestFor: 'Moderate bullish trend',
    riskLevel: 'Low'
  },
  {
    type: 'bear_put_spread',
    name: 'Bear Put Spread',
    description: 'Buy ITM put + Sell OTM put for moderate bearish view',
    winRate: '65-75%',
    bestFor: 'Moderate bearish trend',
    riskLevel: 'Low'
  },
  {
    type: 'calendar_spread',
    name: 'Calendar Spread',
    description: 'Sell near-month + Buy far-month for time decay',
    winRate: '60-70%',
    bestFor: 'Neutral to slightly directional markets',
    riskLevel: 'Low'
  },
  {
    type: 'ratio_spread',
    name: 'Ratio Spread',
    description: 'Buy 1 ATM + Sell 2 OTM for strong directional views',
    winRate: '55-65%',
    bestFor: 'Strong directional conviction',
    riskLevel: 'High'
  }
]

export interface StrategyConfig {
  id: number
  user_id: number
  is_enabled: boolean
  strategy_type: StrategyType
  version: string
  symbols: string[]
  enabled_strategies: StrategyType[]
  strategy_allocation: Record<StrategyType, number>
  start_time: string
  end_time: string
  alpha1_long_call_threshold: number
  alpha2_long_call_threshold: number
  alpha1_long_put_threshold: number
  alpha2_long_put_threshold: number
  min_option_price: number
  stop_loss_percent: number
  trailing_stop_percent: number
  default_quantity: number
  max_positions: number
  send_signal_alerts: boolean
  send_trade_alerts: boolean
  created_at: string
  updated_at: string
}

export interface StrategySignal {
  id: number
  signal_type: string
  alpha1: number
  alpha2: number
  signal_strength: number
  strike_price: number
  option_type: string
  option_price: number
  spot_price: number
  atm_strike: number
  expiry_date: string
  is_active: boolean
  is_traded: boolean
  signal_time: string
}

export interface StrategyTrade {
  id: number
  strategy_name: string
  strategy_version: string
  trade_type: string
  strike_price: number
  option_type: string
  expiry_date: string
  quantity: number
  entry_price: number
  entry_time: string
  exit_price: number | null
  exit_time: string | null
  exit_reason: string | null
  stop_loss_price: number
  trailing_stop_price: number | null
  pnl: number | null
  pnl_percent: number | null
  status: string
  created_at: string
}

export interface StrategyStats {
  total_trades: number
  winning_trades: number
  losing_trades: number
  win_rate: number
  total_pnl: number
  avg_pnl: number
  max_profit: number
  max_loss: number
}

export const strategyApi = {
  // Config
  getConfig: async (): Promise<StrategyConfig> => {
    const response = await apiClient.get('/strategy/config')
    return response.data
  },

  updateConfig: async (config: Partial<StrategyConfig>): Promise<StrategyConfig> => {
    const response = await apiClient.post('/strategy/config', config)
    return response.data
  },

  // Signals
  getSignals: async (limit = 50, activeOnly = false): Promise<StrategySignal[]> => {
    const response = await apiClient.get('/strategy/signals', {
      params: { limit, active_only: activeOnly }
    })
    return response.data
  },

  // Trades
  getTrades: async (limit = 50, activeOnly = false): Promise<StrategyTrade[]> => {
    const response = await apiClient.get('/strategy/trades', {
      params: { limit, active_only: activeOnly }
    })
    return response.data
  },

  getActiveTradesCount: async (): Promise<{ active_count: number }> => {
    const response = await apiClient.get('/strategy/trades/active-count')
    return response.data
  },

  // Stats
  getStats: async (): Promise<StrategyStats> => {
    const response = await apiClient.get('/strategy/stats')
    return response.data
  },
}
