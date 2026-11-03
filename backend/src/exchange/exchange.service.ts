import { BadRequestException, Injectable } from '@nestjs/common';
import { CalculationParamsDto } from '../settings/dto/calculation-params.dto';
import { ExchangeSource } from '../settings/entities/user-settings.entity';
import { RapiraAdapter } from './adapters/rapira.adapter';
import { ExchangeSourceAdapter } from './interfaces/exchange-adapter.interface';
import { DecimalMath } from './utils/decimal-math.util';

const CACHE_TTL_MS = 60_000;

interface CachedBaseRate {
  baseRate: number;
  fetchedAt: string;
  expiresAt: number;
}

export interface ExchangeRateResult {
  source: ExchangeSource;
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

@Injectable()
export class ExchangeService {
  private readonly adapters = new Map<ExchangeSource, ExchangeSourceAdapter>();
  private readonly priceCache = new Map<string, CachedBaseRate>();
  private readonly inFlightRequests = new Map<
    string,
    Promise<CachedBaseRate>
  >();

  constructor(private readonly rapiraAdapter: RapiraAdapter) {
    this.registerAdapter(this.rapiraAdapter);
  }

  private registerAdapter(adapter: ExchangeSourceAdapter): void {
    this.adapters.set(adapter.source, adapter);
  }

  private getAdapter(source: ExchangeSource): ExchangeSourceAdapter {
    const adapter = this.adapters.get(source);
    if (!adapter) {
      throw new BadRequestException(`Источник курса "${source}" не поддерживается`);
    }
    return adapter;
  }

  async getRate(dto: CalculationParamsDto): Promise<ExchangeRateResult> {
    const adapter = this.getAdapter(dto.source);
    const cacheKey = adapter.getCacheKey(dto);

    const { cachedEntry, fromCache } = await this.getOrFetchBaseRate(
      adapter,
      dto,
      cacheKey,
    );

    const finalRate = this.applyDeviations(
      cachedEntry.baseRate,
      dto.deviationPercentage ?? 0,
      dto.deviationAbsolute ?? 0,
    );

    const asset = dto.asset.trim().toUpperCase();
    const fiat = dto.fiat.trim().toUpperCase();

    return {
      source: dto.source,
      asset,
      fiat,
      symbol: `${asset}/${fiat}`,
      direction: dto.direction,
      baseRate: cachedEntry.baseRate,
      finalRate,
      deviationPercentage: dto.deviationPercentage ?? 0,
      deviationAbsolute: dto.deviationAbsolute ?? 0,
      fetchedAt: cachedEntry.fetchedAt,
      fromCache,
    };
  }

  private async getOrFetchBaseRate(
    adapter: ExchangeSourceAdapter,
    dto: CalculationParamsDto,
    cacheKey: string,
  ): Promise<{ cachedEntry: CachedBaseRate; fromCache: boolean }> {
    const now = Date.now();
    const existing = this.priceCache.get(cacheKey);

    if (existing && existing.expiresAt > now) {
      return { cachedEntry: existing, fromCache: true };
    }

    // Если запрос с таким же ключом уже выполняется — ждём его результат
    const inFlight = this.inFlightRequests.get(cacheKey);
    if (inFlight) {
      const entry = await inFlight;
      return { cachedEntry: entry, fromCache: true };
    }

    const fetchPromise = (async (): Promise<CachedBaseRate> => {
      const baseRate = await adapter.requestBasePrice(dto);
      const fetchedNow = Date.now();
      const entry: CachedBaseRate = {
        baseRate,
        fetchedAt: new Date(fetchedNow).toISOString(),
        expiresAt: fetchedNow + CACHE_TTL_MS,
      };
      this.priceCache.set(cacheKey, entry);
      return entry;
    })();

    this.inFlightRequests.set(cacheKey, fetchPromise);

    try {
      const entry = await fetchPromise;
      return { cachedEntry: entry, fromCache: false };
    } finally {
      this.inFlightRequests.delete(cacheKey);
    }
  }

  /**
   * Применяет процентную, а затем абсолютную поправку с округлением каждого шага до 5 знаков
   */
  applyDeviations(
    baseRate: number,
    deviationPercentage = 0,
    deviationAbsolute = 0,
  ): number {
    let result = new DecimalMath(baseRate).round().value;

    if (
      typeof deviationPercentage === 'number' &&
      !Number.isNaN(deviationPercentage) &&
      deviationPercentage !== 0
    ) {
      const pctDelta = new DecimalMath(baseRate)
        .divide(100)
        .multiply(deviationPercentage)
        .round().value;
      result = new DecimalMath(result).plus(pctDelta).round().value;
    }

    if (
      typeof deviationAbsolute === 'number' &&
      !Number.isNaN(deviationAbsolute) &&
      deviationAbsolute !== 0
    ) {
      result = new DecimalMath(result).plus(deviationAbsolute).round().value;
    }

    return result;
  }

  clearCache(): void {
    this.priceCache.clear();
  }
}