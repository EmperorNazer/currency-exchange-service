import { apiClient } from './client';
import type { CalculationParams } from './settings';

export interface ExchangeRateResult {
  source: string;
  asset: string;
  fiat: string;
  symbol: string;
  direction: string;
  baseRate: number;
  finalRate: number;
  deviationPercentage: number;
  deviationAbsolute: number;
  fetchedAt: string;
  fromCache: boolean;
}

export async function calculateRateApi(params: CalculationParams): Promise<ExchangeRateResult> {
  const { data } = await apiClient.post<ExchangeRateResult>('/exchange/rate', params);
  return data;
}