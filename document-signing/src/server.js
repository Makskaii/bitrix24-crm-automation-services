import http from "node:http";
import { URL } from "node:url";
import { config } from "./config.js";
import { parseRequest } from "./event.js";
import { logger } from "./logger.js";
import { processDeal } from "./services/processor.js";

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

        const dealPath = url.pathname.match(
            /^\/process-documents\/(\d+)$/
        );

        if (
            request.method !== "POST" ||
            (
                url.pathname !== "/process-documents" &&
                !dealPath
            )
        ) {
            return json(response, 404, { error: "not_found" });
        }

        const payload = await parseRequest(request);
        const dealId = dealPath?.[1] || payload.dealId;

        if (!Number(dealId)) {
            return json(response, 400, { error: "dealId_required" });
        }

        const result = await processDeal(dealId);
        return json(response, 200, result);
    } catch (error) {
        logger.error("HTTP handler error", {
            error: error?.stack || error?.message || String(error)
        });
        return json(response, 500, { error: "processing_failed" });
    }
});

server.listen(config.port, "0.0.0.0", () => {
    logger.info("Handler started", { port: config.port });
});
