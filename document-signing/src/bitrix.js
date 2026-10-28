import { config } from "./config.js";

export class BitrixError extends Error {
    constructor(method, status, message, responseBody) {
        super(message);
        this.method = method;
        this.status = status;
        this.responseBody = responseBody;
    }
}

function canonicalBitrixRestUrl() {
    const url = new URL(config.bitrixRestUrl);

    if (url.host === "b24-14tps9.bitrix24.ru") {
        url.host = "stanford.bitrix24.ru";
    }

    return url.toString().replace(/\/$/, "");
}

async function parseResponse(method, response) {
    const text = await response.text();
    let data;

    try {
        data = JSON.parse(text);
    } catch {
        throw new BitrixError(
            method,
            response.status,
            `Bitrix returned non-JSON response: ${response.status}`,
            text.slice(0, 1000)
        );
    }

    if (!response.ok || data.error) {
        throw new BitrixError(
            method,
            response.status,
            data.error_description || data.error || text,
            text
        );
    }

    return data.result;
}

export async function callBitrix(method, params = {}) {
    const response = await fetch(
        `${canonicalBitrixRestUrl()}/${method}.json`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify(params)
        }
    );

    return parseResponse(method, response);
}

export async function getCrmItem(entityTypeId, id) {
    const result = await callBitrix("crm.item.get", {
        entityTypeId: Number(entityTypeId),
        id: Number(id),
        useOriginalUfNames: "Y"
    });

    return result.item;
}

export async function getDeal(id) {
    return getCrmItem(2, id);
}

export async function getCompany(id) {
    return getCrmItem(4, id);
}

export async function getContact(id) {
    return getCrmItem(3, id);
}

export async function updateDealProcessed(dealId) {
    return callBitrix("crm.item.update", {
        entityTypeId: 2,
        id: Number(dealId),
        fields: {
            [config.dealProcessedField]: "Yes"
        }
    });
}

export async function addTimelineComment(dealId, comment) {
    return callBitrix("crm.timeline.comment.add", {
        fields: {
            ENTITY_ID: Number(dealId),
            ENTITY_TYPE: "deal",
            COMMENT: comment
        }
    });
}

function fileNameFromDisposition(value) {
    const match = value?.match(
        /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i
    );

    if (!match) {
        return null;
    }

    try {
        return decodeURIComponent(match[1] || match[2]);
    } catch {
        return match[1] || match[2];
    }
}

export async function downloadFile(url) {
    const absoluteUrl = url.startsWith("http")
        ? url
        : `${config.bitrixPortalUrl}${url.startsWith("/") ? "" : "/"}${url}`;
    const response = await fetch(absoluteUrl);

    if (!response.ok) {
        throw new Error(`File download failed with HTTP ${response.status}`);
    }

    return {
        buffer: Buffer.from(await response.arrayBuffer()),
        contentType: response.headers.get("content-type"),
        fileName: fileNameFromDisposition(
            response.headers.get("content-disposition")
        )
    };
}
