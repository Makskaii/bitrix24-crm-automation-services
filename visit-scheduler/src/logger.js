import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

fs.mkdirSync(config.logDir, { recursive: true });

function write(level, message, details = {}) {
    const entry = JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message,
        ...details
    });

    console.log(entry);
    fs.appendFileSync(path.join(config.logDir, "handler.log"), `${entry}\n`);
}

export const logger = {
    info(message, details) {
        write("INFO", message, details);
    },
    error(message, details) {
        write("ERROR", message, details);
    }
};
