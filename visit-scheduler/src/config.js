import path from "node:path";
import { loadEnv } from "./env.js";

loadEnv();

for (const name of ["BITRIX_PORTAL_URL", "BITRIX_REST_URL", "EVENT_SECRET"]) {
    if (!process.env[name]) {
        throw new Error(`Missing environment variable: ${name}`);
    }
}

export const config = {
    port: Number(process.env.VISIT_PORT || 3016),
    bitrixRestUrl: process.env.BITRIX_REST_URL.replace(/\/$/, ""),
    eventSecret: process.env.EVENT_SECRET,
    visitStartField: "UF_CRM_1787305632",
    visitEndField: "UF_CRM_1787305662",
    visitScheduledField: "ufCrm_1787301520899",
    createSeparateCalendarEvent: false,
    logDir: path.resolve("logs")
};
