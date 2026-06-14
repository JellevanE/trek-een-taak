import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import type { Response } from "express";

import app from "../src/app";
import { ensureAdmin } from "../src/middleware/auth";
import type { AuthenticatedRequest } from "../src/types/auth";
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

beforeAll(() => {
  dataDir = mkdtempSync(join(tmpdir(), "task-track-auth-"));
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

beforeEach(() => {
  resetTaskStore(tasksFile);
  resetCampaignStore(campaignsFile);
  resetUserStore(usersFile, [buildDefaultUser()]);
  resetRegistrationRateLimiter();
});

afterAll(() => {
  resetDataFileOverrides();
  if (dataDir) {
    rmSync(dataDir, { recursive: true, force: true });
  }
});

function expectError(
  response: { status: number; body: unknown },
  status: number,
) {
  expect(response.status).toBe(status);
  const body = response.body as JsonRecord;
  expect(typeof body.error).toBe("string");
}

test("register rejects blank username", async () => {
  const res = await client.post("/api/users/register", {
    body: { username: "   ", password: "secret123" },
    headers: { accept: "application/json" },
  });
  expectError(res, 400);
});

test("register rejects passwords shorter than 6 chars", async () => {
  const res = await client.post("/api/users/register", {
    body: { username: "newhero", password: "123" },
    headers: { accept: "application/json" },
  });
  expectError(res, 400);
});

test("register rejects invalid profile class", async () => {
  const res = await client.post("/api/users/register", {
    body: {
      username: "invalidclass",
      password: "secret123",
      profile: { class: "paladin" },
    },
    headers: { accept: "application/json" },
  });
  expect(res.status).toBe(400);
  const body = res.body as JsonRecord;
  expect(String(body.error)).toMatch(/profile\.class/i);
});

test("register rejects duplicate usernames", async () => {
  const first = await client.post("/api/users/register", {
    body: { username: "guildmaster", password: "password123" },
    headers: { accept: "application/json" },
  });
  expect(first.status).toBe(201);

  const dup = await client.post("/api/users/register", {
    body: { username: "GuildMaster", password: "password123" },
    headers: { accept: "application/json" },
  });
  expectError(dup, 400);
});

test("login requires both username and password", async () => {
  const res = await client.post("/api/users/login", {
    body: { username: "someone" },
    headers: { accept: "application/json" },
  });
  expectError(res, 400);
});

test("login rejects invalid credentials", async () => {
  await client.post("/api/users/register", {
    body: { username: "scout", password: "password123" },
    headers: { accept: "application/json" },
  });

  const res = await client.post("/api/users/login", {
    body: { username: "scout", password: "wrongpass" },
    headers: { accept: "application/json" },
  });
  expectError(res, 401);
});

test("login succeeds after registration", async () => {
  const register = await client.post("/api/users/register", {
    body: { username: "enchanter", password: "password123" },
    headers: { accept: "application/json" },
  });
  expect(register.status).toBe(201);

  const login = await client.post("/api/users/login", {
    body: { username: "Enchanter", password: "password123" },
    headers: { accept: "application/json" },
  });
  expect(login.status).toBe(200);
  const body = login.body as JsonRecord;
  expect(typeof body.token).toBe("string");
  const user = body.user as JsonRecord;
  expect(user.username).toBe("enchanter");
  expect(user).not.toHaveProperty("password_hash");
});

describe("ensureAdmin middleware", () => {
  const originalAdminUsernames = process.env.ADMIN_USERNAMES;

  function mockRes() {
    const res = {
      statusCode: 0,
      body: null as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.body = payload;
        return this;
      },
    };
    return res as unknown as Response & { statusCode: number; body: unknown };
  }

  afterEach(() => {
    if (originalAdminUsernames === undefined) {
      delete process.env.ADMIN_USERNAMES;
    } else process.env.ADMIN_USERNAMES = originalAdminUsernames;
  });

  function spyNext() {
    const fn = (() => {
      fn.calls += 1;
    }) as (() => void) & { calls: number };
    fn.calls = 0;
    return fn;
  }

  test("returns 401 when no authenticated user is present", () => {
    process.env.ADMIN_USERNAMES = "someadmin";
    const res = mockRes();
    const next = spyNext();
    ensureAdmin({} as AuthenticatedRequest, res, next);
    expect(res.statusCode).toBe(401);
    expect(next.calls).toBe(0);
  });

  test("returns 403 for an authenticated non-admin", () => {
    process.env.ADMIN_USERNAMES = "someadmin";
    const res = mockRes();
    const next = spyNext();
    ensureAdmin(
      { user: { id: 2, username: "regular" } } as AuthenticatedRequest,
      res,
      next,
    );
    expect(res.statusCode).toBe(403);
    expect(next.calls).toBe(0);
  });

  test("calls next for an admin user (matched case-insensitively)", () => {
    process.env.ADMIN_USERNAMES = "SomeAdmin";
    const res = mockRes();
    const next = spyNext();
    ensureAdmin(
      { user: { id: 1, username: "someadmin" } } as AuthenticatedRequest,
      res,
      next,
    );
    expect(next.calls).toBe(1);
    expect(res.statusCode).toBe(0);
  });
});
