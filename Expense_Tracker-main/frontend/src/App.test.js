import {
  formatCurrency,
  formatDate,
  getGreeting,
  toInputDate,
} from "./utils/app";

test("formats finance helpers", () => {
  expect(formatCurrency(2500, "INR")).toMatch(/2,500/);
  expect(formatDate("2026-04-16")).toMatch(/2026/);
  expect(toInputDate("2026-04-16T00:00:00.000Z")).toBe("2026-04-16");
  expect(getGreeting("Azeem")).toMatch(/Azeem/);
});
