import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

// client/public/index.html runs a tiny inline script before paint to set the
// theme from localStorage (prevents a flash of the wrong theme). helmet's
// default CSP (script-src 'self') blocks inline scripts, so allow this one by
// the sha256 of its MINIFIED build output. If you change that snippet, the
// browser console prints the new expected hash — update this value to match.
const THEME_BOOTSTRAP_CSP_HASH =
    "'sha256-bOATH51DAM9jc7+rBzIK0kADd/LWOnOee8f4npu+NlM='";

app.use(
    helmet({
        contentSecurityPolicy: {
            useDefaults: true,
            directives: {
                scriptSrc: ["'self'", THEME_BOOTSTRAP_CSP_HASH],
            },
        },
    }),
);
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

// In production, serve the compiled React client from this same service
// (single-service deploy). The build output lives at client/build; override
// with CLIENT_BUILD_DIR if the layout differs. Skipped in dev/test, where the
// client runs separately on its own port.
const clientBuildDir = process.env.CLIENT_BUILD_DIR
    ? path.resolve(process.env.CLIENT_BUILD_DIR)
    : path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../client/build",
    );

if (process.env.NODE_ENV === "production" && fs.existsSync(clientBuildDir)) {
    app.use(express.static(clientBuildDir));

    // SPA fallback: any non-API GET that didn't match a static asset returns
    // index.html so client-side routing survives deep links and refreshes.
    // (Express 5 / path-to-regexp 8 reject a bare "*" route, so use middleware.)
    app.use((req, res, next) => {
        if (req.method !== "GET") return next();
        if (req.path.startsWith("/api/")) return next();
        return res.sendFile(path.join(clientBuildDir, "index.html"));
    });
}

export default app;
