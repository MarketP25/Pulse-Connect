import { FundSchema } from "@/lib/models/Fund";

describe("FundSchema", () => {
  it("should validate a valid fund object", () => {
    const validFund = { amount: 100, currency: "USD" };
    expect(() => FundSchema.parse(validFund)).not.toThrow();
  });

  it("should throw an error for a negative amount", () => {
    const invalidFund = { amount: -50, currency: "USD" };
    expect(() => FundSchema.parse(invalidFund)).toThrow(
      "Amount must be positive"
    );
  });

  it("should throw an error for an invalid currency code", () => {
    const invalidFund = { amount: 100, currency: "US" };
    expect(() => FundSchema.parse(invalidFund)).toThrow();
  });
});
