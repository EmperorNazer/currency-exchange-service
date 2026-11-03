import Decimal from 'decimal.js';

export class DecimalMath {
  private readonly val: Decimal;

  constructor(value: number | string | Decimal) {
    this.val = new Decimal(value);
  }

  plus(other: number | string | Decimal): DecimalMath {
    return new DecimalMath(this.val.plus(other));
  }

  multiply(other: number | string | Decimal): DecimalMath {
    return new DecimalMath(this.val.times(other));
  }

  divide(other: number | string | Decimal): DecimalMath {
    return new DecimalMath(this.val.dividedBy(other));
  }

  round(precision = 5): DecimalMath {
    return new DecimalMath(
      this.val.toDecimalPlaces(precision, Decimal.ROUND_HALF_UP),
    );
  }

  get value(): number {
    return this.val.toNumber();
  }
}