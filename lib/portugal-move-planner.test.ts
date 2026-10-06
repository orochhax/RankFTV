import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateUnpaidExpenseTotals,
  normalizePlannerExpenses,
  unlinkExpensesForTask,
  upsertTaskAndLinkedExpense,
  type PlannerData,
} from "./portugal-move-planner";

const emptyData: PlannerData = { tasks: [], expenses: [], exchangeRate: 6.25 };

test("adding a task with a price creates one linked expense already paid", () => {
  const task = { id: "task-1", name: "Passaporte", dueDate: "2026-10-20", completed: false };
  const result = upsertTaskAndLinkedExpense(emptyData, task, 500, "BRL", "expense-1");

  assert.deepEqual(result.tasks, [task]);
  assert.deepEqual(result.expenses, [{
    id: "expense-1", taskId: "task-1", name: "Passaporte", amount: 500,
    currency: "BRL", dueDate: "2026-10-20", paid: true,
  }]);
  assert.deepEqual(calculateUnpaidExpenseTotals(result.expenses), { brl: 0, eur: 0 });
});

test("editing a linked task updates its expense without duplicating or resetting payment", () => {
  const task = { id: "task-1", name: "Passaporte renovado", dueDate: "2026-10-21", completed: true };
  const starting: PlannerData = {
    ...emptyData,
    tasks: [{ id: "task-1", name: "Passaporte", dueDate: "2026-10-20", completed: false }],
    expenses: [{ id: "expense-1", taskId: "task-1", name: "Passaporte", amount: 500, currency: "BRL", dueDate: "2026-10-20", paid: false }],
  };
  const result = upsertTaskAndLinkedExpense(starting, task, 550, "EUR", "unused-id");

  assert.equal(result.expenses.length, 1);
  assert.deepEqual(result.expenses[0], {
    id: "expense-1", taskId: "task-1", name: "Passaporte renovado", amount: 550,
    currency: "EUR", dueDate: "2026-10-21", paid: false,
  });
});

test("paid expenses remain visible but do not contribute to either currency total", () => {
  const expenses = normalizePlannerExpenses([
    { id: "paid", name: "Passaporte", amount: 500, currency: "BRL", dueDate: "", paid: true },
    { id: "brl", name: "Tradução", amount: 100, currency: "BRL", dueDate: "", paid: false },
    { id: "eur", name: "Taxa", amount: 30, currency: "EUR", dueDate: "", paid: false },
  ]);
  assert.deepEqual(calculateUnpaidExpenseTotals(expenses), { brl: 100, eur: 30 });
});

test("older saved expenses default to unpaid when loaded", () => {
  const [expense] = normalizePlannerExpenses([
    { id: "old", name: "Seguro", amount: 70, currency: "EUR", dueDate: "" },
  ]);
  assert.equal(expense.paid, false);
});

test("removing a task preserves its linked financial record as a standalone expense", () => {
  const [expense] = unlinkExpensesForTask([
    { id: "expense-1", taskId: "task-1", name: "Passaporte", amount: 500, currency: "BRL", dueDate: "", paid: true },
  ], "task-1");
  assert.equal(expense.taskId, undefined);
  assert.equal(expense.amount, 500);
  assert.equal(expense.paid, true);
});

test("clearing the optional task price unlinks but does not erase its expense history", () => {
  const task = { id: "task-1", name: "Passaporte", dueDate: "2026-10-20", completed: false };
  const starting: PlannerData = {
    ...emptyData,
    tasks: [task],
    expenses: [{ id: "expense-1", taskId: "task-1", name: "Passaporte", amount: 500, currency: "BRL", dueDate: task.dueDate, paid: true }],
  };
  const result = upsertTaskAndLinkedExpense(starting, task, null, "BRL", "unused-id");

  assert.equal(result.expenses.length, 1);
  assert.equal(result.expenses[0].taskId, undefined);
  assert.equal(result.expenses[0].amount, 500);
  assert.deepEqual(calculateUnpaidExpenseTotals(result.expenses), { brl: 0, eur: 0 });
});
