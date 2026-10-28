import path from "node:path";
import { loadEnv } from "./env.js";

loadEnv();

for (const name of ["BITRIX_PORTAL_URL", "BITRIX_REST_URL", "EVENT_SECRET"]) {
    if (!process.env[name]) {
        throw new Error(`Missing environment variable: ${name}`);
    }
}

export const config = {
    port: Number(process.env.POSTPONED_PORT || 3015),
    bitrixPortalUrl: process.env.BITRIX_PORTAL_URL.replace(/\/$/, ""),
    bitrixRestUrl: process.env.BITRIX_REST_URL.replace(/\/$/, ""),
    eventSecret: process.env.EVENT_SECRET,
    intervalMs: Number(process.env.POSTPONED_CHECK_INTERVAL_MS || 60 * 60 * 1000),
    delayMinutes: Number(process.env.POSTPONED_DELAY_MINUTES || 0),
    createTaskImmediately: true,
    delayDays: 14,
    allowedStages: new Set([
        "C4:UC_AIXNCB",
        "UC_CP6MY1",
        "C2:UC_18XTO1"
    ]),
    stateFile: path.resolve("data/postponed-cycles.json"),
    logDir: path.resolve("logs")
};
