import type { Response } from "express";

import { readTasks } from "../data/taskStore.js";
import { readUsers } from "../data/userStore.js";
import { sendError } from "../utils/http.js";
import { assertAuthenticated } from "../utils/authGuard.js";
import type { AuthenticatedRequest } from "../types/auth.js";

/**
 * GET /api/admin/stats
 * Read-only snapshot of accounts for the operator: count, usernames, signup /
 * last-active timestamps, and light per-user usage (task count, level, xp).
 * No secrets or PII (password_hash, email) are included.
 */
export function getStats(
  req: AuthenticatedRequest,
  res: Response,
): Response | void {
  if (!assertAuthenticated(req, res)) return;

  try {
    const usersData = readUsers();
    const tasksData = readTasks();

    const taskCountByOwner = new Map<number, number>();
    for (const task of tasksData.tasks) {
      taskCountByOwner.set(
        task.owner_id,
        (taskCountByOwner.get(task.owner_id) ?? 0) + 1,
      );
    }

    const users = usersData.users.map((user) => ({
      id: user.id,
      username: user.username,
      created_at: user.created_at,
      updated_at: user.updated_at,
      level: user.rpg?.level ?? 0,
      xp: user.rpg?.xp ?? 0,
      task_count: taskCountByOwner.get(user.id) ?? 0,
    }));

    return res.json({
      generated_at: new Date().toISOString(),
      total_accounts: users.length,
      users,
    });
  } catch (err) {
    console.error("Failed to build admin stats", err);
    return sendError(res, 500, "Failed to build admin stats");
  }
}
