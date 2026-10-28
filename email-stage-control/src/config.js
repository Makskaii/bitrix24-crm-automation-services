import path from "node:path";
import { loadEnv } from "./env.js";

loadEnv();

const required = [
    "BITRIX_PORTAL_URL",
    "BITRIX_REST_URL",
    "EVENT_SECRET"
];

for (const name of required) {
    if (!process.env[name]) {
        throw new Error(`Missing environment variable: ${name}`);
    }
}

export const config = {
    port: Number(process.env.PORT || 3013),
    bitrixPortalUrl: process.env.BITRIX_PORTAL_URL.replace(/\/$/, ""),
    bitrixRestUrl: process.env.BITRIX_REST_URL.replace(/\/$/, ""),
    eventSecret: process.env.EVENT_SECRET,
    dealEmailSentField:
        process.env.DEAL_EMAIL_SENT_FIELD ||
        "ufCrm_1786632827958",
    logDir: path.resolve("logs")
};
