export class Fail<F, S> {
  readonly value: F;

  constructor(value: F) {
    this.value = value;
  }

  isFail(): this is Fail<F, S> {
    return true;
  }

  isSuccess(): this is Success<F, S> {
    return false;
  }
}

export class Success<F, S> {
  readonly value: S;

  constructor(value: S) {
    this.value = value;
  }

  isFail(): this is Fail<F, S> {
    return false;
  }

  isSuccess(): this is Success<F, S> {
    return true;
  }
}

export type Result<F, S> = Fail<F, S> | Success<F, S>;

export function fail<F, S>(value: F): Result<F, S> {
  return new Fail<F, S>(value);
}

export function success<F, S>(value: S): Result<F, S> {
  return new Success<F, S>(value);
}
