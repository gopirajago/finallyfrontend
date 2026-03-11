import { apiClient } from './api-client'

export interface ChainRow {
  strike: number
  is_atm: boolean
  ce_ltp: number
  ce_oi: number
  ce_iv: number
  ce_delta: number
  ce_symbol: string
  pe_ltp: number
  pe_oi: number
  pe_iv: number
  pe_delta: number
  pe_symbol: string
}

export interface RecommendedOption {
  strike: number
  type: 'CE' | 'PE'
  premium: number
  delta: number
  iv: number
  theta: number
  oi: number
  volume: number
  distance_pct: number
  score: number
  is_hero_zero: boolean
  cost_per_lot: number
  max_profit_estimate: number | null
  reasons: string[]
  trading_symbol: string
  tag: string
}

export interface OptionChainResponse {
  symbol: string
  underlying_ltp: number
  atm_strike: number
  expiry: string
  expiries: string[]
  is_expiry_day: boolean
  pcr: number
  pcr_sentiment: 'Bullish' | 'Bearish' | 'Neutral'
  max_pain: number | null
  lot_size: number
  chain_table: ChainRow[]
  recommended: RecommendedOption[]
  hero_zero: RecommendedOption[]
}

export const OPTION_INSTRUMENTS = [
  'NIFTY', 'BANKNIFTY', 'SENSEX', 'NIFTY IT',
  'RELIANCE', 'INFY', 'TCS', 'HDFCBANK', 'ICICIBANK', 'SBIN',
]

export const optionsApi = {
  getChain: async (symbol: string, expiry?: string): Promise<OptionChainResponse> => {
    const res = await apiClient.get<OptionChainResponse>('/options/chain', {
      params: { symbol, ...(expiry ? { expiry } : {}) },
    })
    return res.data
  },
}
