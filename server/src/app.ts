import cors from "cors";
import express from "express";
import helmet from "helmet";

import { authenticate } from "./middleware/auth.js";
import { applyTestingListenPatch } from "./utils/testingListenPatch.js";
import { corsOptions } from "./security/corsOptions.js";
import { resolveTrustProxy } from "./security/trustProxy.js";

import adminRouter from "./routes/admin.js";
import campaignsRouter from "./routes/campaigns.js";
import debugRouter from "./routes/debug.js";
import rpgRouter from "./routes/rpg.js";
import tasksRouter from "./routes/tasks.js";
import usersRouter from "./routes/users.js";
import docsRouter from "./routes/docs.js";
import storylinesRouter from "./routes/storylines.js";

const app = express();

applyTestingListenPatch(app);

// Behind a host's reverse proxy, trust the proxy so req.ip (used for rate
// limiting) reflects the real client. Configured via TRUST_PROXY; off by default.
app.set("trust proxy", resolveTrustProxy());

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "64kb" }));
app.use(authenticate);

app.use("/api/docs", docsRouter);
app.use("/api/users", usersRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/campaigns", campaignsRouter);
app.use("/api/rpg", rpgRouter);
app.use("/api/storylines", storylinesRouter);
app.use("/api/admin", adminRouter);
app.use("/api/debug", debugRouter);

export default app;
