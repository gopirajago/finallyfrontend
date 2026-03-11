import { apiClient } from './api-client'

export interface Holding {
  tradingSymbol: string
  exchange: string
  isin: string
  quantity: number
  averagePrice: number
  lastPrice: number
  pnl: number
  pnlPercentage: number
  currentValue: number
  investedValue: number
  product: string
}

export interface Position {
  tradingSymbol: string
  exchange: string
  product: string
  quantity: number
  averagePrice: number
  lastPrice: number
  pnl: number
  buyQuantity: number
  sellQuantity: number
  buyValue: number
  sellValue: number
}

export interface CapitalData {
  availableCash: number
  usedMargin: number
  totalMargin: number
  availableMargin: number
  exposureMargin: number
  spanMargin: number
  collateral: number
  totalBalance: number
}

export const portfolioApi = {
  getHoldings: async (): Promise<unknown> => {
    const res = await apiClient.get('/portfolio/holdings')
    return res.data
  },

  getPositions: async (): Promise<unknown> => {
    const res = await apiClient.get('/portfolio/positions')
    return res.data
  },

  getCapital: async (): Promise<unknown> => {
    const res = await apiClient.get('/portfolio/capital')
    return res.data
  },

  getProfile: async (): Promise<unknown> => {
    const res = await apiClient.get('/portfolio/profile')
    return res.data
  },
}
