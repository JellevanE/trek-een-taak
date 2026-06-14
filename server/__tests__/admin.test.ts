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
let adminToken: string;
let adminUsername: string;
const originalAdminUsernames = process.env.ADMIN_USERNAMES;

beforeAll(() => {
  dataDir = mkdtempSync(join(tmpdir(), "task-track-admin-"));
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

  adminUsername = `admin_${Date.now()}`;
  process.env.ADMIN_USERNAMES = adminUsername;

  const register = await client.post("/api/users/register", {
    body: { username: adminUsername, password: "password123" },
    headers: { accept: "application/json" },
  });
  adminToken = (register.body as JsonRecord).token as string;
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

function adminHeaders() {
  return { authorization: `Bearer ${adminToken}`, accept: "application/json" };
}

test("stats requires authentication", async () => {
  const res = await client.get("/api/admin/stats");
  expect(res.status).toBe(401);
});

test("stats rejects authenticated non-admin users", async () => {
  process.env.ADMIN_USERNAMES = "";
  const register = await client.post("/api/users/register", {
    body: { username: `plain_${Date.now()}`, password: "password123" },
    headers: { accept: "application/json" },
  });
  const token = (register.body as JsonRecord).token as string;

  const res = await client.get("/api/admin/stats", {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
  });
  expect(res.status).toBe(403);
});

test("stats returns account count, usernames and per-user usage", async () => {
  // Give the admin two tasks so task_count is exercised.
  await client.post("/api/tasks", {
    body: { description: "first" },
    headers: adminHeaders(),
  });
  await client.post("/api/tasks", {
    body: { description: "second" },
    headers: adminHeaders(),
  });

  const res = await client.get("/api/admin/stats", { headers: adminHeaders() });
  expect(res.status).toBe(200);

  const body = res.body as JsonRecord;
  expect(typeof body.generated_at).toBe("string");
  // default seeded user + the registered admin
  expect(body.total_accounts).toBe(2);

  const users = body.users as JsonRecord[];
  expect(Array.isArray(users)).toBe(true);
  expect(users).toHaveLength(2);

  const admin = users.find((u) => u.username === adminUsername) as JsonRecord;
  expect(admin).toBeDefined();
  expect(admin.task_count).toBe(2);
  expect(typeof admin.level).toBe("number");
  expect(typeof admin.xp).toBe("number");
  expect(typeof admin.created_at).toBe("string");
  expect(typeof admin.updated_at).toBe("string");

  // No secrets or PII leaked.
  expect(admin.password_hash).toBeUndefined();
  expect(admin.email).toBeUndefined();
});
