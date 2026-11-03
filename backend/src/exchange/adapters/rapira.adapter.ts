import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import FormData from 'form-data';
import { CalculationParamsDto } from '../../settings/dto/calculation-params.dto';
import {
  ExchangeDirection,
  ExchangeSource,
} from '../../settings/entities/user-settings.entity';
import {
  ExchangeSourceAdapter,
  OrderBookItem,
  OrderBookResponse,
} from '../interfaces/exchange-adapter.interface';
import { DecimalMath } from '../utils/decimal-math.util';

const MIN_ASSET_AMOUNT = 10000;
const DEFAULT_REQUEST_TIMEOUT_MS = 8000;

interface CalculationAccumulator {
  sum: number;
  amount: number;
  ids: string[];
  skipOrdersLeft: number | null;
  takeOrdersLeft: number | null;
  prices: number[];
}

@Injectable()
export class RapiraAdapter implements ExchangeSourceAdapter {
  readonly source = ExchangeSource.RAPIRA;
  private readonly url: string;

  constructor(private readonly configService: ConfigService) {
    this.url = this.configService.get<string>(
      'RAPIRA_URL',
      'https://api.rapira.net/market/exchange-plate-mini',
    );
  }

  /**
   * Формирование нормализованного ключа кеша
   */
  getCacheKey(options: CalculationParamsDto): string {
    const symbol = this.getSymbol(options);
    const direction = this.getDirection(options);
    let cacheKey = `${this.source}|${symbol}|direction=${direction}`;

    if (options.amount !== null && options.amount !== undefined) {
      cacheKey += `|amount=${Number(options.amount)}`;
    }
    if (options.skipOrders && Number(options.skipOrders) > 0) {
      cacheKey += `|skip_orders=${Number(options.skipOrders)}`;
    }
    if (options.takeOrders !== null && options.takeOrders !== undefined) {
      cacheKey += `|take_orders=${Number(options.takeOrders)}`;
    }
    if (options.arithmetic) {
      cacheKey += `|arithmetic=true`;
    }

    return cacheKey;
  }

  /**
   * Запрашивает стакан у Рапиры и рассчитывает базовый курс
   */
  async requestBasePrice(options: CalculationParamsDto): Promise<number> {
    const orderBook = await this.fetchOrderBook(options);
    return this.calculatePriceFromOrderBook(options, orderBook);
  }

  /**
   * HTTP POST запрос к Рапире (multipart/form-data)
   */
  private async fetchOrderBook(
    options: CalculationParamsDto,
  ): Promise<OrderBookResponse> {
    const symbol = this.getSymbol(options);
    const formData = new FormData();
    formData.append('symbol', symbol);

    try {
      const response = await axios.request<OrderBookResponse>({
        url: this.url,
        method: 'POST',
        data: formData,
        headers: {
          ...formData.getHeaders(),
          Accept: 'application/json',
        },
        timeout: DEFAULT_REQUEST_TIMEOUT_MS,
      });

      if (!response.data || typeof response.data !== 'object') {
        throw new BadGatewayException(
          `Некорректный формат ответа от биржи Рапира для пары ${symbol}`,
        );
      }

      return response.data;
    } catch (error: any) {
      if (
        error instanceof BadGatewayException ||
        error instanceof UnprocessableEntityException
      ) {
        throw error;
      }

      const isTimeout =
        error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT';

      if (isTimeout) {
        throw new GatewayTimeoutException(
          'Превышено время ожидания ответа от биржи Рапира',
        );
      }

      throw new BadGatewayException(
        `Не удалось получить стакан с биржи Рапира: ${error?.message || 'ошибка сети'}`,
      );
    }
  }

  /**
   * Чистая функция расчёта курса по стакану
   */
  calculatePriceFromOrderBook(
    options: CalculationParamsDto,
    data: OrderBookResponse,
  ): number {
    const symbol = this.getSymbol(options);
    const direction = this.getDirection(options);
    const trades =
      direction === ExchangeDirection.SELL ? data?.ask?.items : data?.bid?.items;

    if (!Array.isArray(trades) || trades.length === 0) {
      throw new UnprocessableEntityException(
        `Нет доступных заявок в стакане для пары ${symbol} (${direction})`,
      );
    }

    const accumulator: CalculationAccumulator = {
      sum: 0,
      amount: 0,
      ids: [],
      skipOrdersLeft:
        options.skipOrders && options.skipOrders > 0
          ? Number(options.skipOrders)
          : null,
      takeOrdersLeft:
        options.takeOrders !== null && options.takeOrders !== undefined
          ? Number(options.takeOrders)
          : null,
      prices: [],
    };

    let tradeIndex = 0;

    for (const trade of trades) {
      if (
        !this.moreAmountNeeded(options, accumulator) ||
        !this.moreOrdersNeeded(accumulator)
      ) {
        break;
      }

      const price = Number(trade.price);
      const amount = Number(trade.amount);

      if (!Number.isFinite(price) || !Number.isFinite(amount) || amount <= 0) {
        tradeIndex++;
        continue;
      }

      const tradeId = `${price}_${amount}_${tradeIndex}`;

      if (!accumulator.ids.includes(tradeId)) {
        if (
          typeof accumulator.skipOrdersLeft === 'number' &&
          accumulator.skipOrdersLeft > 0
        ) {
          accumulator.skipOrdersLeft--;
          tradeIndex++;
          continue;
        }

        const isTakeOrdersLeftProvided =
          typeof accumulator.takeOrdersLeft === 'number';

        if (!isTakeOrdersLeftProvided || accumulator.takeOrdersLeft! > 0) {
          this.mergeResponse({ price, amount }, accumulator, tradeId);
          if (isTakeOrdersLeftProvided) {
            accumulator.takeOrdersLeft!--;
          }
        }
      }

      tradeIndex++;
    }

    if (!accumulator.amount || accumulator.ids.length === 0) {
      throw new UnprocessableEntityException(
        'Не удалось рассчитать курс: после применения фильтров (skipOrders/takeOrders) не осталось подходящих заявок',
      );
    }

    const rawPrice = options.arithmetic
      ? new DecimalMath(
          accumulator.prices.reduce(
            (acc, val) => new DecimalMath(acc).plus(val).value,
            0,
          ),
        ).divide(accumulator.ids.length).value
      : new DecimalMath(accumulator.sum).divide(accumulator.amount).value;

    return new DecimalMath(rawPrice).round().value;
  }

  private mergeResponse(
    trade: OrderBookItem,
    acc: CalculationAccumulator,
    tradeId: string,
  ): void {
    const orderVolumeCost = new DecimalMath(trade.price).multiply(
      trade.amount,
    ).value;
    acc.sum = new DecimalMath(acc.sum).plus(orderVolumeCost).value;
    acc.amount = new DecimalMath(acc.amount).plus(trade.amount).value;
    acc.ids.push(tradeId);
    acc.prices.push(trade.price);
  }

  private moreAmountNeeded(
    options: CalculationParamsDto,
    accumulator: CalculationAccumulator,
  ): boolean {
    if (
      options.arithmetic &&
      (options.amount === null || options.amount === undefined)
    ) {
      return true;
    }
    const targetAmount = this.getAmount(options);
    return accumulator.amount < targetAmount;
  }

  private moreOrdersNeeded(accumulator: CalculationAccumulator): boolean {
    return (
      typeof accumulator.takeOrdersLeft !== 'number' ||
      accumulator.takeOrdersLeft > 0
    );
  }

  private getAmount(options: CalculationParamsDto): number {
    return options.amount !== null && options.amount !== undefined
      ? Number(options.amount)
      : MIN_ASSET_AMOUNT;
  }

  private getSymbol(options: CalculationParamsDto): string {
    return `${options.asset.trim().toUpperCase()}/${options.fiat.trim().toUpperCase()}`;
  }

  private getDirection(options: CalculationParamsDto): ExchangeDirection {
    return options.direction?.toLowerCase() === ExchangeDirection.SELL
      ? ExchangeDirection.SELL
      : ExchangeDirection.BUY;
  }
}