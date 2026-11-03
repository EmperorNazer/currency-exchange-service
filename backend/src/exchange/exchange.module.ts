import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RapiraAdapter } from './adapters/rapira.adapter';
import { ExchangeController } from './exchange.controller';
import { ExchangeService } from './exchange.service';

@Module({
  imports: [ConfigModule],
  controllers: [ExchangeController],
  providers: [ExchangeService, RapiraAdapter],
  exports: [ExchangeService],
})
export class ExchangeModule {}