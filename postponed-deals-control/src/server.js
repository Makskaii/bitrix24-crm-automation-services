import http from "node:http";
import { URL } from "node:url";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { startCycle, startScheduler } from "./services/postponed.js";

function json(response, status, data) {
    response.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });
    response.end(JSON.stringify(data));
}

const server = http.createServer(async (request, response) => {
    try {
        const url = new URL(request.url, `http://${request.headers.host}`);

        if (request.method === "GET" && url.pathname === "/health") {
            return json(response, 200, { status: "ok" });
        }

        const match = url.pathname.match(/^\/postponed\/start\/(\d+)$/);

        if (request.method !== "POST" || !match) {
            return json(response, 404, { error: "not_found" });
        }

        if (url.searchParams.get("secret") !== config.eventSecret) {
            return json(response, 403, { error: "forbidden" });
        }

        const result = await startCycle(match[1]);
        return json(response, 200, result);
    } catch (error) {
        logger.error("postponed_http_handler_failed", {
            error: error?.stack || error?.message || String(error)
        });
        return json(response, 500, { error: "internal_error" });
    }
});

startScheduler();

server.listen(config.port, "0.0.0.0", () => {
    logger.info("postponed_handler_started", { port: config.port });
});
