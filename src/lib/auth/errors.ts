export class UnauthorizedError extends Error {
  readonly status = 401 as const;
  constructor(message = "unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  readonly status = 403 as const;
  constructor(message = "forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}
