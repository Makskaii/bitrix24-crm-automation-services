import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

fs.mkdirSync(config.logDir, { recursive: true });

const file = path.join(config.logDir, "handler.log");

function write(level, message, meta = {}) {
    const line = JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message,
        ...meta
    });

    console.log(line);
    fs.appendFileSync(file, `${line}\n`);
}

export const logger = {
    info(message, meta) {
        write("INFO", message, meta);
    },
    warn(message, meta) {
        write("WARN", message, meta);
    },
    error(message, meta) {
        write("ERROR", message, meta);
    }
};
