import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSettings, ExchangeDirection, ExchangeSource } from './entities/user-settings.entity';
import { CalculationParamsDto } from './dto/calculation-params.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(UserSettings)
    private readonly settingsRepo: Repository<UserSettings>,
  ) {}

  async getOrCreateByUserId(userId: string): Promise<UserSettings> {
    let settings = await this.settingsRepo.findOne({ where: { userId } });

    if (!settings) {
      settings = this.settingsRepo.create({
        userId,
        source: ExchangeSource.RAPIRA,
        asset: 'USDT',
        fiat: 'RUB',
        direction: ExchangeDirection.BUY,
        amount: null,
        skipOrders: 0,
        takeOrders: null,
        arithmetic: false,
        deviationPercentage: 0,
        deviationAbsolute: 0,
      });
      settings = await this.settingsRepo.save(settings);
    }

    return settings;
  }

  async updateByUserId(userId: string, dto: CalculationParamsDto): Promise<UserSettings> {
    const settings = await this.getOrCreateByUserId(userId);

    Object.assign(settings, {
      source: dto.source,
      asset: dto.asset,
      fiat: dto.fiat,
      direction: dto.direction,
      amount: dto.amount ?? null,
      skipOrders: dto.skipOrders,
      takeOrders: dto.takeOrders ?? null,
      arithmetic: dto.arithmetic,
      deviationPercentage: dto.deviationPercentage,
      deviationAbsolute: dto.deviationAbsolute,
    });

    return this.settingsRepo.save(settings);
  }
}