export type MoveCurrency = "BRL" | "EUR";

export type MoveTaskCategory = {
  id: string;
  name: string;
  collapsed: boolean;
};

export type MoveTask = {
  id: string;
  name: string;
  dueDate: string;
  completed: boolean;
  categoryId?: string;
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
  categories: MoveTaskCategory[];
  expenses: MoveExpense[];
  exchangeRate: number;
};

export function normalizeTaskGroups(
  rawCategories: unknown,
  tasks: MoveTask[],
): { categories: MoveTaskCategory[]; tasks: MoveTask[] } {
  const categories: MoveTaskCategory[] = [];
  const categoryIds = new Set<string>();
  if (Array.isArray(rawCategories)) {
    for (const item of rawCategories) {
      if (typeof item !== "object" || item === null || Array.isArray(item)) continue;
      const category = item as Record<string, unknown>;
      if (typeof category.id !== "string" || !category.id || categoryIds.has(category.id)
        || typeof category.name !== "string" || !category.name.trim()) continue;
      categoryIds.add(category.id);
      categories.push({
        id: category.id,
        name: category.name.trim(),
        collapsed: category.collapsed === true,
      });
    }
  }

  const needsLegacyCategory = tasks.some((task) => !task.categoryId || !categoryIds.has(task.categoryId));
  if (!needsLegacyCategory) return { categories, tasks };

  let legacyId = "legacy-general";
  while (categoryIds.has(legacyId)) legacyId = `_${legacyId}`;
  categories.push({ id: legacyId, name: "Geral", collapsed: false });
  return {
    categories,
    tasks: tasks.map((task) => task.categoryId && categoryIds.has(task.categoryId)
      ? task
      : { ...task, categoryId: legacyId }),
  };
}

export function calculateUnpaidExpenseTotals(expenses: MoveExpense[]) {
  return expenses.reduce((totals, expense) => {
    if (expense.paid) return totals;
    if (expense.currency === "BRL") totals.brl += expense.amount;
    else totals.eur += expense.amount;
    return totals;
  }, { brl: 0, eur: 0 });
}

export function setTaskCompletion(data: PlannerData, taskId: string, completed: boolean): PlannerData {
  return {
    ...data,
    tasks: data.tasks.map((task) => task.id === taskId ? { ...task, completed } : task),
    expenses: data.expenses.map((expense) => expense.taskId === taskId
      ? { ...expense, paid: completed }
      : expense),
  };
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
    // A linked expense is paid exactly when its task is marked complete.
    paid: task.completed,
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

export function normalizePlannerExpenses(value: unknown, tasks: MoveTask[] = []): MoveExpense[] {
  if (!Array.isArray(value)) return [];
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  return value.flatMap((item): MoveExpense[] => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return [];
    const expense = item as Record<string, unknown>;
    if (typeof expense.id !== "string" || typeof expense.name !== "string"
      || typeof expense.amount !== "number" || !Number.isFinite(expense.amount) || expense.amount < 0
      || (expense.currency !== "BRL" && expense.currency !== "EUR") || typeof expense.dueDate !== "string") return [];
    const taskId = typeof expense.taskId === "string" ? expense.taskId : undefined;
    const linkedTask = taskId ? taskById.get(taskId) : undefined;
    return [{
      id: expense.id,
      name: expense.name,
      amount: expense.amount,
      currency: expense.currency,
      dueDate: expense.dueDate,
      paid: linkedTask ? linkedTask.completed : typeof expense.paid === "boolean" ? expense.paid : false,
      ...(linkedTask ? { taskId: linkedTask.id } : {}),
    }];
  });
}
