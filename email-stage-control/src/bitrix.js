import { config } from "./config.js";

async function parseResponse(response) {
    const text = await response.text();
    let data;

    try {
        data = JSON.parse(text);
    } catch {
        throw new Error(
            `Bitrix returned non-JSON response: ${response.status} ${text.slice(0, 500)}`
        );
    }

    if (!response.ok || data.error) {
        throw new Error(
            `${data.error || response.status}: ${data.error_description || text}`
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

    return parseResponse(response);
}

function canonicalBitrixRestUrl() {
    const restUrl = new URL(config.bitrixRestUrl);

    if (restUrl.host === "b24-14tps9.bitrix24.ru") {
        restUrl.host = "stanford.bitrix24.ru";
    }

    return restUrl.toString().replace(/\/$/, "");
}

export async function getActivity(activityId) {
    return callBitrix("crm.activity.get", {
        id: Number(activityId)
    });
}

export async function getDeal(dealId) {
    const result = await callBitrix("crm.item.get", {
        entityTypeId: 2,
        id: Number(dealId),
        useOriginalUfNames: "Y"
    });

    return result.item;
}

export async function markDealEmailSent(dealId) {
    return callBitrix("crm.item.update", {
        entityTypeId: 2,
        id: Number(dealId),
        fields: {
            [config.dealEmailSentField]: "Yes"
        }
    });
}
