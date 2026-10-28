import { config } from "./config.js";

async function parseResponse(response, method) {
    const text = await response.text();
    let data;

    try {
        data = JSON.parse(text);
    } catch {
        const error = new Error(`Bitrix returned non-JSON response: ${response.status} ${text.slice(0, 500)}`);
        error.method = method;
        throw error;
    }

    if (!response.ok || data.error) {
        const error = new Error(`${data.error || response.status}: ${data.error_description || text}`);
        error.method = method;
        throw error;
    }

    return data.result;
}

function canonicalBitrixRestUrl() {
    const restUrl = new URL(config.bitrixRestUrl);

    if (restUrl.host === "b24-14tps9.bitrix24.ru") {
        restUrl.host = "stanford.bitrix24.ru";
    }

    return restUrl.toString().replace(/\/$/, "");
}

export async function callBitrix(method, params = {}) {
    const response = await fetch(`${canonicalBitrixRestUrl()}/${method}.json`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
        },
        body: JSON.stringify(params)
    });

    return parseResponse(response, method);
}

async function getCrmItem(entityTypeId, id) {
    const result = await callBitrix("crm.item.get", {
        entityTypeId,
        id: Number(id),
        useOriginalUfNames: "Y"
    });

    return result.item;
}

export function getDeal(dealId) {
    return getCrmItem(2, dealId);
}

export function getContact(contactId) {
    return getCrmItem(3, contactId);
}

export function getCompany(companyId) {
    return getCrmItem(4, companyId);
}

export async function createFollowUpTask({ dealId, responsibleId, description }) {
    const result = await callBitrix("tasks.task.add", {
        fields: {
            TITLE: "Follow up with client",
            DESCRIPTION: description,
            DEADLINE: null,
            CREATED_BY: 1,
            RESPONSIBLE_ID: Number(responsibleId),
            UF_CRM_TASK: [`D_${dealId}`]
        }
    });

    const taskId = result?.task?.id || result?.id;

    if (!taskId) {
        throw new Error("Bitrix did not return the created task ID");
    }

    await callBitrix("tasks.task.update", {
        taskId: Number(taskId),
        fields: {
            DEADLINE: null
        }
    });

    return result;
}
