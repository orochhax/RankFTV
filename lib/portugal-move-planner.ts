export type MoveCurrency = "BRL" | "EUR";

export type MoveTask = {
  id: string;
  name: string;
  dueDate: string;
  completed: boolean;
};

export type MoveExpense = {
  id: string;
  name: string;
  amount: number;
  currency: MoveCurrency;
  dueDate: string;
  paid: boolean;
  taskId?: string;
};

export type PlannerData = {
  tasks: MoveTask[];
  expenses: MoveExpense[];
  exchangeRate: number;
};

export function calculateUnpaidExpenseTotals(expenses: MoveExpense[]) {
  return expenses.reduce((totals, expense) => {
    if (expense.paid) return totals;
    if (expense.currency === "BRL") totals.brl += expense.amount;
    else totals.eur += expense.amount;
    return totals;
  }, { brl: 0, eur: 0 });
}

export function upsertTaskAndLinkedExpense(
  data: PlannerData,
  task: MoveTask,
  amount: number | null,
  currency: MoveCurrency,
  newExpenseId: string,
): PlannerData {
  const linkedExpense = data.expenses.find((expense) => expense.taskId === task.id);
  const tasks = data.tasks.some((item) => item.id === task.id)
    ? data.tasks.map((item) => item.id === task.id ? task : item)
    : [...data.tasks, task];

  if (amount === null) {
    return {
      ...data,
      tasks,
      // Keep the financial history; clearing the optional task value only unlinks it.
      expenses: linkedExpense
        ? data.expenses.map((expense) => expense.id === linkedExpense.id
          ? { ...expense, taskId: undefined }
          : expense)
        : data.expenses,
    };
  }

  const expense: MoveExpense = {
    id: linkedExpense?.id ?? newExpenseId,
    taskId: task.id,
    name: task.name,
    amount: Math.round(amount * 100) / 100,
    currency,
    dueDate: task.dueDate,
    // Linked expenses are paid at creation. Preserve the status if edited later.
    paid: linkedExpense?.paid ?? true,
  };

  return {
    ...data,
    tasks,
    expenses: linkedExpense
      ? data.expenses.map((item) => item.id === linkedExpense.id ? expense : item)
      : [...data.expenses, expense],
  };
}

export function unlinkExpensesForTask(expenses: MoveExpense[], taskId: string): MoveExpense[] {
  return expenses.map((expense) => expense.taskId === taskId
    ? { ...expense, taskId: undefined }
    : expense);
}

export function normalizePlannerTasks(value: unknown): MoveTask[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is MoveTask =>
    typeof item === "object" && item !== null && !Array.isArray(item)
    && typeof item.id === "string" && typeof item.name === "string"
    && typeof item.dueDate === "string" && typeof item.completed === "boolean",
  );
}

export function normalizePlannerExpenses(value: unknown): MoveExpense[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): MoveExpense[] => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return [];
    const expense = item as Record<string, unknown>;
    if (typeof expense.id !== "string" || typeof expense.name !== "string"
      || typeof expense.amount !== "number" || !Number.isFinite(expense.amount) || expense.amount < 0
      || (expense.currency !== "BRL" && expense.currency !== "EUR") || typeof expense.dueDate !== "string") return [];
    return [{
      id: expense.id,
      name: expense.name,
      amount: expense.amount,
      currency: expense.currency,
      dueDate: expense.dueDate,
      paid: typeof expense.paid === "boolean" ? expense.paid : false,
      ...(typeof expense.taskId === "string" ? { taskId: expense.taskId } : {}),
    }];
  });
}
