import { UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CalculationParamsDto } from '../settings/dto/calculation-params.dto';
import {
  ExchangeDirection,
  ExchangeSource,
} from '../settings/entities/user-settings.entity';
import { RapiraAdapter } from './adapters/rapira.adapter';
import { ExchangeService } from './exchange.service';
import { OrderBookResponse } from './interfaces/exchange-adapter.interface';

const SAMPLE_ORDER_BOOK: OrderBookResponse = {
  bid: {
    items: [
      { price: 100, amount: 100 },
      { price: 99, amount: 300 },
      { price: 98, amount: 600 },
    ],
  },
  ask: {
    items: [
      { price: 101, amount: 100 },
      { price: 102, amount: 300 },
      { price: 103, amount: 600 },
    ],
  },
};

function createBaseParams(
  overrides: Partial<CalculationParamsDto> = {},
): CalculationParamsDto {
  return Object.assign(new CalculationParamsDto(), {
    source: ExchangeSource.RAPIRA,
    asset: 'USDT',
    fiat: 'RUB',
    direction: ExchangeDirection.BUY,
    amount: 350,
    skipOrders: 0,
    takeOrders: null,
    arithmetic: false,
    deviationPercentage: 0,
    deviationAbsolute: 0,
    ...overrides,
  });
}

describe('Exchange Rate Calculation & Caching (Spec Sections 5.2 - 6)', () => {
  let adapter: RapiraAdapter;
  let service: ExchangeService;

  beforeEach(() => {
    adapter = new RapiraAdapter(new ConfigService());
    service = new ExchangeService(adapter);
  });

  it('1. Базовые параметры (bid № 1-2; 400 USDT) -> 99.25000', () => {
    const params = createBaseParams();
    const baseRate = adapter.calculatePriceFromOrderBook(params, SAMPLE_ORDER_BOOK);
    expect(baseRate).toBe(99.25);
  });

  it('2. arithmetic=true (bid № 1-2; среднее цен) -> 99.50000', () => {
    const params = createBaseParams({ arithmetic: true });
    const baseRate = adapter.calculatePriceFromOrderBook(params, SAMPLE_ORDER_BOOK);
    expect(baseRate).toBe(99.5);
  });

  it('3. amount=500 (bid № 1-3; 1 000 USDT) -> 98.50000', () => {
    const params = createBaseParams({ amount: 500 });
    const baseRate = adapter.calculatePriceFromOrderBook(params, SAMPLE_ORDER_BOOK);
    expect(baseRate).toBe(98.5);
  });

  it('4. takeOrders=1 (Только bid № 1; 100 USDT) -> 100.00000', () => {
    const params = createBaseParams({ takeOrders: 1 });
    const baseRate = adapter.calculatePriceFromOrderBook(params, SAMPLE_ORDER_BOOK);
    expect(baseRate).toBe(100);
  });

  it('5. skipOrders=1 (bid № 2-3; 900 USDT) -> 98.33333', () => {
    const params = createBaseParams({ skipOrders: 1 });
    const baseRate = adapter.calculatePriceFromOrderBook(params, SAMPLE_ORDER_BOOK);
    expect(baseRate).toBe(98.33333);
  });

  it('6. direction=sell (ask № 1-2; 400 USDT) -> 101.75000', () => {
    const params = createBaseParams({ direction: ExchangeDirection.SELL });
    const baseRate = adapter.calculatePriceFromOrderBook(params, SAMPLE_ORDER_BOOK);
    expect(baseRate).toBe(101.75);
  });

  it('7. Поправки deviationPercentage=1 и deviationAbsolute=0.5 к 99.25 -> 100.74250', () => {
    const finalRate = service.applyDeviations(99.25, 1, 0.5);
    expect(finalRate).toBe(100.7425);
  });

  it('8. Граничные случаи: без amount при arithmetic=false (порог 10 000) -> 98.50000', () => {
    const params = createBaseParams({ amount: null, arithmetic: false });
    const baseRate = adapter.calculatePriceFromOrderBook(params, SAMPLE_ORDER_BOOK);
    expect(baseRate).toBe(98.5);
  });

  it('9. Граничные случаи: без amount при arithmetic=true -> 99.00000', () => {
    const params = createBaseParams({ amount: null, arithmetic: true });
    const baseRate = adapter.calculatePriceFromOrderBook(params, SAMPLE_ORDER_BOOK);
    expect(baseRate).toBe(99);
  });

  it('10. Граничные случаи: skipOrders=3 пропускает весь стакан -> выбрасывает ошибку', () => {
    const params = createBaseParams({ skipOrders: 3 });
    expect(() =>
      adapter.calculatePriceFromOrderBook(params, SAMPLE_ORDER_BOOK),
    ).toThrow(UnprocessableEntityException);
  });

  it('11. Кеширование и объединение параллельных запросов: 1 вызов биржи на 2 одновременных запроса', async () => {
    const spy = jest
      .spyOn(adapter, 'requestBasePrice')
      .mockImplementation(async (dto) =>
        adapter.calculatePriceFromOrderBook(dto, SAMPLE_ORDER_BOOK),
      );

    const [res1, res2] = await Promise.all([
      service.getRate(createBaseParams({ deviationPercentage: 0 })),
      service.getRate(createBaseParams({ deviationPercentage: 1, deviationAbsolute: 0.5 })),
    ]);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(res1.baseRate).toBe(99.25);
    expect(res1.finalRate).toBe(99.25);
    expect(res2.baseRate).toBe(99.25);
    expect(res2.finalRate).toBe(100.7425);
  });
});