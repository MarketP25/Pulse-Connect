export class IdentityError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "IdentityError";
  }
}

export function asIdentityError(error: unknown): IdentityError {
  if (error instanceof IdentityError) {
    return error;
  }

  return new IdentityError("identity_internal_error", 500, "Unexpected identity service error");
}
