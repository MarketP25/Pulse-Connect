export interface SpendBudget {
  id: string;
  user_id: string;
  total_budget: number;
  spent: number;
  period: "daily" | "monthly" | "yearly";
  last_reset: Date;
}

export interface SpendRule {
  id: string;
  condition: string;
  action: "pause" | "rollback";
  threshold: number;
}

export class SpendControls {
  private budgets: Map<string, SpendBudget> = new Map();
  private rules: SpendRule[] = [];

  /**
   * Set budget for a user
   */
  setBudget(budget: SpendBudget): void {
    this.budgets.set(budget.user_id, budget);
  }

  /**
   * Add spend rule
   */
  addRule(rule: SpendRule): void {
    this.rules.push(rule);
  }

  /**
   * Record spend
   */
  recordSpend(user_id: string, amount: number): void {
    const budget = this.budgets.get(user_id);
    if (budget) {
      budget.spent += amount;
      this.checkRules(user_id);
    }
  }

  /**
   * Check spend rules and apply actions
   */
  private checkRules(user_id: string): void {
    const budget = this.budgets.get(user_id);
    if (!budget) return;

    for (const rule of this.rules) {
      if (this.evaluateCondition(rule.condition, budget)) {
        this.applyAction(rule.action, user_id);
      }
    }
  }

  /**
   * Evaluate spend condition
   */
  private evaluateCondition(condition: string, budget: SpendBudget): boolean {
    // Simple condition evaluation
    if (condition === "spent > 80% of budget") {
      return budget.spent > budget.total_budget * 0.8;
    }
    if (condition === "spent > budget") {
      return budget.spent > budget.total_budget;
    }
    return false;
  }

  /**
   * Apply spend action
   */
  private applyAction(action: "pause" | "rollback", user_id: string): void {
    if (action === "pause") {
      console.log(`Auto-pausing spend for user ${user_id}`);
      // Implement pause logic
    } else if (action === "rollback") {
      console.log(`Rolling back spend for user ${user_id}`);
      // Implement rollback logic
    }
  }

  /**
   * Safe rollback - revert last spend
   */
  safeRollback(user_id: string, amount: number): void {
    const budget = this.budgets.get(user_id);
    if (budget) {
      budget.spent = Math.max(0, budget.spent - amount);
    }
  }

  /**
   * Get budget for user
   */
  getBudget(user_id: string): SpendBudget | undefined {
    return this.budgets.get(user_id);
  }
}
