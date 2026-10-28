import http from "node:http";
import { URL } from "node:url";
import { config } from "./config.js";
import { parseEventBody } from "./event.js";
import { logger } from "./logger.js";
import { processActivityEvent } from "./services/activity.js";

function json(response, status, data) {
    response.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    response.end(JSON.stringify(data));
}

const server = http.createServer(async (request, response) => {
    try {
        const url = new URL(
            request.url,
            `http://${request.headers.host}`
        );

        if (request.method === "GET" && url.pathname === "/health") {
            return json(response, 200, { status: "ok" });
        }

        if (
            request.method !== "POST" ||
            url.pathname !== "/bitrix/events/activity"
        ) {
            return json(response, 404, { error: "not_found" });
        }

        if (url.searchParams.get("secret") !== config.eventSecret) {
            return json(response, 403, { error: "forbidden" });
        }

        const event = await parseEventBody(request);

        if (String(event.event || "").toUpperCase() !== "ONCRMACTIVITYADD") {
            return json(response, 200, { status: "ignored" });
        }

        if (!event.activityId) {
            throw new Error("Event does not contain activity ID");
        }

        json(response, 200, { status: "accepted" });

        setImmediate(() => {
            processActivityEvent(event);
        });
    } catch (error) {
        logger.error("HTTP handler error", {
            error: error?.stack || error?.message || String(error)
        });

        if (!response.headersSent) {
            json(response, 500, { error: "internal_error" });
        }
    }
});

server.listen(config.port, "0.0.0.0", () => {
    logger.info("Handler started", { port: config.port });
});
