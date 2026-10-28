function flatValue(
    params,
    ...names
) {
    for (const name of names) {
        const value =
            params.get(name);

        if (value !== null) {
            return value;
        }
    }

    return null;
}

export async function parseEventBody(
    request
) {
    const chunks = [];

    for await (
        const chunk of request
    ) {
        chunks.push(chunk);
    }

    const body =
        Buffer.concat(chunks)
            .toString("utf8");

    const type =
        request.headers[
        "content-type"
        ] || "";

    if (
        type.includes(
            "application/json"
        )
    ) {
        const parsed =
            JSON.parse(body || "{}");

        return {
            event:
                parsed.event,

            documentId:
                parsed?.data
                    ?.FIELDS
                    ?.ID,

            entityTypeId:
                parsed?.data
                    ?.FIELDS
                    ?.ENTITY_TYPE_ID,

            entityId:
                parsed?.data
                    ?.FIELDS
                    ?.ENTITY_ID
        };
    }

    const params =
        new URLSearchParams(body);

    return {
        event:
            flatValue(
                params,
                "event",
                "EVENT"
            ),

        documentId:
            flatValue(
                params,
                "data[FIELDS][ID]",
                "data[FIELDS][id]"
            ),

        entityTypeId:
            flatValue(
                params,
                "data[FIELDS][ENTITY_TYPE_ID]",
                "data[FIELDS][entityTypeId]"
            ),

        entityId:
            flatValue(
                params,
                "data[FIELDS][ENTITY_ID]",
                "data[FIELDS][entityId]"
            )
    };
}