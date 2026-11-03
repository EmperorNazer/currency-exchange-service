import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ExchangeDirection {
  BUY = 'buy',
  SELL = 'sell',
}

export enum ExchangeSource {
  RAPIRA = 'rapira',
}

// Хелпер для чтения numeric-полей из PostgreSQL как чисел, а не строк
const numericTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | null) => (value === null ? null : parseFloat(value)),
};

@Entity('user_settings')
export class UserSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  userId: string;

  @OneToOne(() => User, (user) => user.settings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', default: ExchangeSource.RAPIRA })
  source: ExchangeSource;

  @Column({ type: 'varchar', default: 'USDT' })
  asset: string;

  @Column({ type: 'varchar', default: 'RUB' })
  fiat: string;

  @Column({ type: 'varchar', default: ExchangeDirection.BUY })
  direction: ExchangeDirection;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 8,
    nullable: true,
    default: null,
    transformer: numericTransformer,
  })
  amount: number | null;

  @Column({ type: 'int', default: 0 })
  skipOrders: number;

  @Column({ type: 'int', nullable: true, default: null })
  takeOrders: number | null;

  @Column({ type: 'boolean', default: false })
  arithmetic: boolean;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 5,
    default: 0,
    transformer: numericTransformer,
  })
  deviationPercentage: number;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 5,
    default: 0,
    transformer: numericTransformer,
  })
  deviationAbsolute: number;

  @UpdateDateColumn()
  updatedAt: Date;
}