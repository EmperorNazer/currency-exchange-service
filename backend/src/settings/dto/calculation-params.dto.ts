import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ExchangeDirection, ExchangeSource } from '../entities/user-settings.entity';

export class CalculationParamsDto {
  @ApiProperty({ enum: ExchangeSource, default: ExchangeSource.RAPIRA })
  @IsEnum(ExchangeSource)
  source: ExchangeSource = ExchangeSource.RAPIRA;

  @ApiProperty({ example: 'USDT' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z0-9]{2,10}$/, { message: 'Некорректный формат базового актива (asset)' })
  asset: string = 'USDT';

  @ApiProperty({ example: 'RUB' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z0-9]{2,10}$/, { message: 'Некорректный формат валюты котировки (fiat)' })
  fiat: string = 'RUB';

  @ApiProperty({ enum: ExchangeDirection, default: ExchangeDirection.BUY })
  @IsEnum(ExchangeDirection)
  direction: ExchangeDirection = ExchangeDirection.BUY;

  @ApiPropertyOptional({
    example: 350,
    nullable: true,
    description: 'Объём базового актива (> 0). Пустое значение — без лимита (арифм.) или 10 000 (взвеш.)',
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? null : value))
  @ValidateIf((_, value) => value !== null)
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'amount должен быть конечным числом' })
  @IsPositive({ message: 'amount должен быть строго больше 0' })
  amount?: number | null = null;

  @ApiProperty({ example: 0, default: 0 })
  @IsInt({ message: 'skipOrders должен быть целым числом' })
  @Min(0, { message: 'skipOrders не может быть отрицательным' })
  skipOrders: number = 0;

  @ApiPropertyOptional({ example: null, nullable: true })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? null : value))
  @ValidateIf((_, value) => value !== null)
  @IsInt({ message: 'takeOrders должен быть целым числом' })
  @Min(1, { message: 'takeOrders должен быть не меньше 1' })
  takeOrders?: number | null = null;

  @ApiProperty({ example: false, default: false })
  @IsBoolean()
  arithmetic: boolean = false;

  @ApiProperty({ example: 0, default: 0 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  deviationPercentage: number = 0;

  @ApiProperty({ example: 0, default: 0 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  deviationAbsolute: number = 0;
}