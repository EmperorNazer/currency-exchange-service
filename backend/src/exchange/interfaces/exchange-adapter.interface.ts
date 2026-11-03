import { CalculationParamsDto } from '../../settings/dto/calculation-params.dto';
import { ExchangeSource } from '../../settings/entities/user-settings.entity';

export interface OrderBookItem {
  price: number;
  amount: number;
}

export interface OrderBookSide {
  items?: OrderBookItem[];
}

export interface OrderBookResponse {
  bid?: OrderBookSide;
  ask?: OrderBookSide;
}

export interface ExchangeSourceAdapter {
  readonly source: ExchangeSource;
  getCacheKey(options: CalculationParamsDto): string;
  requestBasePrice(options: CalculationParamsDto): Promise<number>;
  calculatePriceFromOrderBook(
    options: CalculationParamsDto,
    data: OrderBookResponse,
  ): number;
}