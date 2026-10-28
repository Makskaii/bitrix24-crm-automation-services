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

export function createVisitActivity({ dealId, responsibleId, dateStart, dateEnd, comment, communication, subject }) {
    const fields = {
        OWNER_TYPE_ID: 2,
        OWNER_ID: Number(dealId),
        TYPE_ID: 1,
        SUBJECT: subject,
        START_TIME: dateStart,
        END_TIME: dateEnd,
        DESCRIPTION: comment,
        DESCRIPTION_TYPE: 1,
        COMPLETED: "N",
        RESPONSIBLE_ID: Number(responsibleId),
        COMMUNICATIONS: [communication]
    };

    return callBitrix("crm.activity.add", { fields });
}

export async function createVisitCalendarEvent({ dealId, responsibleId, dateStart, dateEnd, comment, subject }) {
    const sections = await callBitrix("calendar.section.get", {
        type: "user",
        ownerId: Number(responsibleId)
    });
    const sectionId = sections?.[0]?.ID || sections?.[0]?.id;

    if (!sectionId) {
        throw new Error("Responsible user does not have an available calendar section");
    }

    return callBitrix("calendar.event.add", {
        type: "user",
        ownerId: Number(responsibleId),
        section: Number(sectionId),
        name: subject,
        description: comment,
        from: dateStart,
        to: dateEnd,
        skip_time: "N",
        timezone_from: "Europe/Moscow",
        timezone_to: "Europe/Moscow",
        accessibility: "busy",
        crm_fields: [`D_${dealId}`]
    });
}

export function markVisitScheduled(dealId) {
    return callBitrix("crm.item.update", {
        entityTypeId: 2,
        id: Number(dealId),
        fields: {
            [config.visitScheduledField]: "Yes"
        }
    });
}
