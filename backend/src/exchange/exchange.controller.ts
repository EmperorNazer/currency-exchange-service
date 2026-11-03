import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CalculationParamsDto } from '../settings/dto/calculation-params.dto';
import { ExchangeRateResult, ExchangeService } from './exchange.service';

@ApiTags('Exchange')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exchange')
export class ExchangeController {
  constructor(private readonly exchangeService: ExchangeService) {}

  @Post('rate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Рассчитать курс валют по заданным параметрам (с учётом кеша 60 сек)',
  })
  calculateRate(@Body() dto: CalculationParamsDto): Promise<ExchangeRateResult> {
    return this.exchangeService.getRate(dto);
  }
}