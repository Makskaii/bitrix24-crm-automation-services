function getValue(params, ...names) {
    for (const name of names) {
        const value = params.get(name);

        if (value !== null) {
            return value;
        }
    }

    return null;
}

export async function parseRequest(request) {
    const chunks = [];

    for await (const chunk of request) {
        chunks.push(chunk);
    }

    const body = Buffer.concat(chunks).toString("utf8");
    const contentType = request.headers["content-type"] || "";

    if (contentType.includes("application/json")) {
        const payload = JSON.parse(body || "{}");

        return {
            dealId: payload.dealId || payload.DEAL_ID || payload.id
        };
    }

    const params = new URLSearchParams(body);

    return {
        dealId: getValue(
            params,
            "dealId",
            "DEAL_ID",
            "id",
            "data[dealId]"
        )
    };
}
