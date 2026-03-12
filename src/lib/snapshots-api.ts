import { apiClient } from './api-client'

export interface SnapshotSummary {
  snapshot_date: string
  available_cash: number
  used_margin: number
  total_capital: number
  holdings_value: number
  total_invested: number
  total_pnl: number
  total_pnl_pct: number
  holdings_count: number
  intraday_pnl: number
  fno_pnl: number
}

export interface SnapshotDetail extends SnapshotSummary {
  id: number
  holdings_json: HoldingRow[] | null
  captured_at: string
}

export interface HoldingRow {
  symbol: string
  quantity: number
  avg_price: number
  ltp: number
  invested: number
  current_value: number
  pnl: number
  pnl_pct: number
}

export type HoldingsHistory = Record<string, DailyHoldingPoint[]>

export interface DailyHoldingPoint {
  date: string
  pnl: number
  pnl_pct: number
  ltp: number
  avg_price: number
  quantity: number
  current_value: number
}

export interface PositionRow {
  symbol: string
  segment: string
  quantity: number
  realised_pnl: number
  unrealised_pnl: number
  pnl: number
}

export interface LiveSummary {
  total_capital: number
  available_cash: number
  used_margin: number
  holdings_value: number
  total_invested: number
  total_pnl: number
  total_pnl_pct: number
  holdings_count: number
  holdings: HoldingRow[]
  intraday_pnl: number
  fno_pnl: number
  positions: PositionRow[]
}

export interface DailyPnlRow {
  date: string
  total_capital: number
  holdings_value: number
  total_invested: number
  equity_pnl: number
  equity_pnl_pct: number
  intraday_pnl: number
  fno_pnl: number
  total_day_pnl: number
  intraday_trades: number
  fno_trades: number
  positions: PositionRow[]
}

export interface HoldingPnlRow {
  symbol: string
  quantity: number
  avg_price: number
  ltp: number
  invested: number
  current_value: number
  pnl: number
  pnl_pct: number
  history: { date: string; pnl: number; pnl_pct: number; ltp: number; current_value: number }[]
}

export interface PnlReport {
  daily: DailyPnlRow[]
  holdings: HoldingPnlRow[]
}

export const snapshotsApi = {
  getLatest: async (): Promise<SnapshotDetail | null> => {
    const res = await apiClient.get('/snapshots/latest')
    return res.data
  },

  getLiveSummary: async (): Promise<LiveSummary> => {
    const res = await apiClient.get('/portfolio/live-summary')
    return res.data
  },

  getHistory: async (days = 30): Promise<SnapshotSummary[]> => {
    const res = await apiClient.get('/snapshots/history', { params: { days } })
    return res.data
  },

  getHoldingsHistory: async (days = 30): Promise<HoldingsHistory> => {
    const res = await apiClient.get('/snapshots/holdings-history', { params: { days } })
    return res.data
  },

  captureNow: async (): Promise<SnapshotDetail> => {
    const res = await apiClient.post('/snapshots/capture-now')
    return res.data
  },

  getPnlReport: async (days = 90): Promise<PnlReport> => {
    const res = await apiClient.get('/snapshots/pnl-report', { params: { days } })
    return res.data
  },
}
