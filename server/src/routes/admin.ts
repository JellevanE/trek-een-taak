import { Router } from "express";

import { ensureAdmin, ensureAuth } from "../middleware/auth.js";
import { getStats } from "../controllers/adminController.js";

const router = Router();

router.use(ensureAuth, ensureAdmin);

router.get("/stats", getStats);

export default router;
