import { apiClient } from './api-client'

export interface Candle {
  time: number   // epoch seconds
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface TradeSignal {
  strategy: string
  direction: 'LONG' | 'SHORT'
  strength: 'High' | 'Medium' | 'Low'
  entry: number
  sl: number
  tp: number
  reason: string
}

export interface FVG {
  type: 'bullish' | 'bearish'
  top: number
  bottom: number
  time: number
}

export interface LiquiditySweep {
  type: 'bullish_sweep' | 'bearish_sweep'
  level: number
  time: number
}

export interface Indicators {
  ema9: number | null
  ema21: number | null
  ema50: number | null
  rsi14: number | null
  atr14: number
  trend: 'bullish' | 'bearish' | 'neutral'
}

export interface Analysis {
  signals: TradeSignal[]
  indicators: Indicators
  sr_levels: number[]
  fvgs: FVG[]
  liquidity_sweeps: LiquiditySweep[]
}

export interface SignalsResponse {
  symbol: string
  interval: number
  ltp: number
  candle_count: number
  analysis: Analysis
  timestamp: number
}

export interface CandlesResponse {
  candles: [number, number, number, number, number, number][]
  interval: number
  symbol: string
}

export interface AISignal {
  direction: 'LONG' | 'SHORT' | 'NEUTRAL'
  confidence: 'High' | 'Medium' | 'Low'
  entry: number
  sl: number
  tp: number
  rr_ratio: number
  reasoning: string
  sentiment: 'Bullish' | 'Bearish' | 'Neutral'
  key_factors: string[]
}

export interface AISignalResponse {
  symbol: string
  interval: number
  ltp: number
  candle_count: number
  analysis: Analysis
  ai_signal: AISignal
  news: { title: string }[]
  timestamp: number
}

export const INTERVALS = [
  { label: '1m',  value: 1 },
  { label: '3m',  value: 3 },
  { label: '5m',  value: 5 },
  { label: '15m', value: 15 },
  { label: '1h',  value: 60 },
  { label: '1d',  value: 1440 },
]

export const INSTRUMENTS = ['NIFTY', 'BANKNIFTY', 'SENSEX', 'NIFTY IT', 'RELIANCE', 'INFY', 'TCS', 'HDFCBANK', 'ICICIBANK', 'SBIN']

export const analysisApi = {
  getCandles: async (symbol: string, interval: number): Promise<CandlesResponse> => {
    const res = await apiClient.get<CandlesResponse>('/analysis/candles', {
      params: { symbol, interval },
    })
    return res.data
  },

  getSignals: async (symbol: string, interval: number): Promise<SignalsResponse> => {
    const res = await apiClient.get<SignalsResponse>('/analysis/signals', {
      params: { symbol, interval },
    })
    return res.data
  },

  getQuote: async (symbol: string): Promise<{ symbol: string; ltp: number; timestamp: number }> => {
    const res = await apiClient.get('/analysis/quote', { params: { symbol } })
    return res.data
  },

  getAISignal: async (symbol: string, interval: number): Promise<AISignalResponse> => {
    const res = await apiClient.post<AISignalResponse>('/analysis/ai-signal', null, {
      params: { symbol, interval },
    })
    return res.data
  },
}
