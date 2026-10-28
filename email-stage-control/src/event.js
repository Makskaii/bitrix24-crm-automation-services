function valueFrom(params, ...names) {
    for (const name of names) {
        const value = params.get(name);

        if (value !== null) {
            return value;
        }
    }

    return null;
}

function redact(value) {
    if (!value || typeof value !== "object") {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map(redact);
    }

    return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
            key,
            /(?:token|auth|secret|password)/i.test(key)
                ? "[redacted]"
                : redact(item)
        ])
    );
}

export async function parseEventBody(request) {
    const chunks = [];

    for await (const chunk of request) {
        chunks.push(chunk);
    }

    const body = Buffer.concat(chunks).toString("utf8");
    const contentType = request.headers["content-type"] || "";

    if (contentType.includes("application/json")) {
        const payload = JSON.parse(body || "{}");

        return {
            event: payload.event || payload.EVENT,
            activityId:
                payload?.data?.FIELDS?.ID ||
                payload?.data?.FIELDS?.id,
            payload: redact(payload)
        };
    }

    const params = new URLSearchParams(body);
    const payload = Object.fromEntries(params.entries());

    return {
        event: valueFrom(params, "event", "EVENT"),
        activityId: valueFrom(
            params,
            "data[FIELDS][ID]",
            "data[FIELDS][id]"
        ),
        payload: redact(payload)
    };
}
