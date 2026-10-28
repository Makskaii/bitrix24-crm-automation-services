import fs from "node:fs";
import path from "node:path";

export function loadEnv(file = ".env") {
    if (!fs.existsSync(file)) {
        return;
    }

    for (const line of fs.readFileSync(path.resolve(file), "utf8").split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);

        if (!match || process.env[match[1]] !== undefined) {
            continue;
        }

        process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    }
}
