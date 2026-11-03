import { apiClient } from './client';

export type ExchangeSource = 'rapira';
export type ExchangeDirection = 'buy' | 'sell';

export interface CalculationParams {
  source: ExchangeSource;
  asset: string;
  fiat: string;
  direction: ExchangeDirection;
  amount: number | null;
  skipOrders: number;
  takeOrders: number | null;
  arithmetic: boolean;
  deviationPercentage: number;
  deviationAbsolute: number;
}

function sanitizeSettings(raw: Record<string, unknown>): CalculationParams {
  return {
    source: (raw.source as ExchangeSource) ?? 'rapira',
    asset: String(raw.asset ?? 'USDT'),
    fiat: String(raw.fiat ?? 'RUB'),
    direction: (raw.direction as ExchangeDirection) ?? 'buy',
    amount: raw.amount !== null && raw.amount !== undefined ? Number(raw.amount) : null,
    skipOrders: Number(raw.skipOrders ?? 0),
    takeOrders:
      raw.takeOrders !== null && raw.takeOrders !== undefined ? Number(raw.takeOrders) : null,
    arithmetic: Boolean(raw.arithmetic),
    deviationPercentage: Number(raw.deviationPercentage ?? 0),
    deviationAbsolute: Number(raw.deviationAbsolute ?? 0),
  };
}

export async function getSettingsApi(): Promise<CalculationParams> {
  const { data } = await apiClient.get<Record<string, unknown>>('/settings');
  return sanitizeSettings(data);
}

export async function updateSettingsApi(params: CalculationParams): Promise<CalculationParams> {
  const { data } = await apiClient.put<Record<string, unknown>>('/settings', params);
  return sanitizeSettings(data);
}