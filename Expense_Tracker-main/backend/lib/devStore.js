const fs = require("fs/promises");
const path = require("path");
const mongoose = require("mongoose");

const storePath = path.join(__dirname, "..", "data", "dev-store.json");

const defaultStore = () => ({
  users: [],
  expenses: [],
  budgets: [],
});

const ensureStore = async () => {
  await fs.mkdir(path.dirname(storePath), { recursive: true });

  try {
    await fs.access(storePath);
  } catch {
    await fs.writeFile(storePath, JSON.stringify(defaultStore(), null, 2));
  }
};

const readStore = async () => {
  await ensureStore();
  const raw = await fs.readFile(storePath, "utf8");

  try {
    return JSON.parse(raw);
  } catch {
    const fresh = defaultStore();
    await fs.writeFile(storePath, JSON.stringify(fresh, null, 2));
    return fresh;
  }
};

const writeStore = async (store) => {
  await ensureStore();
  await fs.writeFile(storePath, JSON.stringify(store, null, 2));
};

const withStore = async (updater) => {
  const store = await readStore();
  const result = await updater(store);
  await writeStore(store);
  return result;
};

const createId = () => new mongoose.Types.ObjectId().toString();

const isDatabaseReady = () => mongoose.connection.readyState === 1;

module.exports = {
  createId,
  isDatabaseReady,
  withStore,
};
