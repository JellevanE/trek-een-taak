import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import app from "../src/app";
import { resetRegistrationRateLimiter } from "../src/security/registrationRateLimiter";
import { createTestClient, type TestClient } from "../src/utils/testClient";
import {
  buildDefaultUser,
  configureDataFiles,
  JsonRecord,
  resetCampaignStore,
  resetDataFileOverrides,
  resetTaskStore,
  resetUserStore,
} from "../src/testing/fixtures";

let dataDir: string;
let tasksFile: string;
let usersFile: string;
let campaignsFile: string;
let client: TestClient;
let authToken: string;
let adminUsername: string;
const originalAdminUsernames = process.env.ADMIN_USERNAMES;

beforeAll(() => {
  dataDir = mkdtempSync(join(tmpdir(), "task-track-debug-"));
  tasksFile = join(dataDir, "tasks.json");
  usersFile = join(dataDir, "users.json");
  campaignsFile = join(dataDir, "campaigns.json");
  configureDataFiles({
    tasks: tasksFile,
    users: usersFile,
    campaigns: campaignsFile,
  });
  client = createTestClient(app);
});

beforeEach(async () => {
  resetTaskStore(tasksFile);
  resetCampaignStore(campaignsFile);
  resetUserStore(usersFile, [buildDefaultUser()]);
  resetRegistrationRateLimiter();

  adminUsername = `debugger_${Date.now()}`;
  // Debug routes now require an admin; make the registered user one.
  process.env.ADMIN_USERNAMES = adminUsername;

  const register = await client.post("/api/users/register", {
    body: { username: adminUsername, password: "password123" },
    headers: { accept: "application/json" },
  });
  authToken = (register.body as JsonRecord).token as string;
});

afterAll(() => {
  if (originalAdminUsernames === undefined) {
    delete process.env.ADMIN_USERNAMES;
  } else {
    process.env.ADMIN_USERNAMES = originalAdminUsernames;
  }
  resetDataFileOverrides();
  if (dataDir) {
    rmSync(dataDir, { recursive: true, force: true });
  }
});

function authHeaders() {
  return { authorization: `Bearer ${authToken}`, accept: "application/json" };
}

test("debug endpoints require authentication", async () => {
  const res = await client.post("/api/debug/clear-tasks");
  expect(res.status).toBe(401);
});

test("debug endpoints reject authenticated non-admin users", async () => {
  // A logged-in but non-admin user must not reach destructive debug routes.
  process.env.ADMIN_USERNAMES = "";
  const register = await client.post("/api/users/register", {
    body: { username: `nonadmin_${Date.now()}`, password: "password123" },
    headers: { accept: "application/json" },
  });
  const token = (register.body as JsonRecord).token as string;

  const res = await client.post("/api/debug/clear-tasks", {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
  });
  expect(res.status).toBe(403);
});

test("clear-tasks removes only the authenticated user tasks", async () => {
  await client.post("/api/tasks", {
    body: { description: "clear me" },
    headers: authHeaders(),
  });

  const res = await client.post("/api/debug/clear-tasks", {
    headers: authHeaders(),
  });
  expect(res.status).toBe(200);
  const body = res.body as JsonRecord;
  expect(body.removed).toBe(1);

  const list = await client.get("/api/tasks", { headers: authHeaders() });
  expect((list.body as JsonRecord).tasks).toEqual([]);
});

test("seed-tasks creates demo tasks and removes previous ones for user", async () => {
  // seed with custom count
  await client.post("/api/tasks", {
    body: { description: "existing to replace" },
    headers: authHeaders(),
  });

  const res = await client.post("/api/debug/seed-tasks", {
    body: { count: 3 },
    headers: authHeaders(),
  });
  expect(res.status).toBe(200);
  const body = res.body as JsonRecord;
  expect(body.created).toBe(3);
  expect(body.removedBeforeSeed).toBe(1);
  const seeded = body.tasks as unknown[];
  expect(Array.isArray(seeded)).toBe(true);
  expect(seeded).toHaveLength(3);

  const list = await client.get("/api/tasks", { headers: authHeaders() });
  const tasks = (list.body as JsonRecord).tasks as unknown[];
  expect(tasks).toHaveLength(3);
});

test("grant-xp adjusts player XP and returns event", async () => {
  const res = await client.post("/api/debug/grant-xp", {
    body: { amount: 75 },
    headers: authHeaders(),
  });
  expect(res.status).toBe(200);
  const body = res.body as JsonRecord;
  const event = body.xp_event as JsonRecord;
  expect(event.amount).toBe(75);
  expect(event.reason).toBe("debug_adjustment");
  const player = body.player_rpg as JsonRecord;
  expect(player.xp).toBeGreaterThanOrEqual(75);
});

test("reset-rpg returns player to baseline stats", async () => {
  await client.post("/api/debug/grant-xp", {
    body: { amount: 100 },
    headers: authHeaders(),
  });

  const res = await client.post("/api/debug/reset-rpg", {
    headers: authHeaders(),
  });
  expect(res.status).toBe(200);
  const body = res.body as JsonRecord;
  const player = body.player_rpg as JsonRecord;
  expect(player.level).toBe(1);
  expect(player.xp).toBe(0);
  const counters = player.counters as JsonRecord;
  expect(counters.tasks_completed).toBe(0);
});
