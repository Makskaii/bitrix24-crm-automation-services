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

function delay(ms) {
    return new Promise(
        (resolve) =>
            setTimeout(resolve, ms)
    );
}

export async function getDocument(
    id,
    entityTypeId,
    entityId
) {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
        const result = await callBitrix(
            "crm.documentgenerator.document.list",
            {
                select: [
                    "id",
                    "title",
                    "number",
                    "templateId",
                    "entityId",
                    "entityTypeId"
                ],
                order: {
                    id: "desc"
                },
                filter: {
                    entityTypeId:
                        Number(entityTypeId),
                    entityId:
                        Number(entityId)
                }
            }
        );

        const document =
            result.documents?.find(
                (item) =>
                    Number(item.id) ===
                    Number(id)
            );

        if (document) {
            return document;
        }

        if (attempt < 5) {
            await delay(1000);
        }
    }

    throw new Error(
        `Document ${id} not found for deal ${entityId}`
    );
}

async function getCrmItemByQuery(
    entityTypeId,
    id
) {
    const params =
        new URLSearchParams({
            entityTypeId:
                String(entityTypeId),
            id: String(id),
            useOriginalUfNames: "Y"
        });

    const response = await fetch(
        `${config.bitrixRestUrl}/crm.item.get.json?${params}`,
        {
            method: "POST",
            headers: {
                Accept: "application/json"
            }
        }
    );

    const result =
        await parseResponse(response);

    return result.item;
}

function canonicalBitrixRestUrl() {
    const url =
        new URL(config.bitrixRestUrl);

    if (
        url.host ===
        "b24-14tps9.bitrix24.ru"
    ) {
        url.host =
            "stanford.bitrix24.ru";
    }

    return url.toString().replace(
        /\/$/,
        ""
    );
}

export async function getDeal(id) {
    return getCrmItemByQuery(
        2,
        id
    );
}

export async function getDealFields() {
    return callBitrix("crm.deal.fields");
}

export async function getRealEstate(id) {
    return getCrmItemByQuery(
        config.realEstateEntityTypeId,
        id
    );
}

export async function getCrmItem(entityTypeId, id) {
    return getCrmItemByQuery(
        entityTypeId,
        id
    );
}

export async function getUser(id) {
    const result = await callBitrix("user.get", {
        ID: id
    });

    if (!Array.isArray(result) || !result.length) {
        throw new Error(`User ${id} not found`);
    }

    return result[0];
}

export async function uploadDocument({
    entityId,
    title,
    number,
    buffer,
    pdfBuffer
}) {
    const result = await callBitrix(
        "crm.documentgenerator.document.upload",
        {
            fields: {
                entityTypeId: 2,
                entityId,
                fileContent: buffer.toString("base64"),
                region: "ru",
                title,
                number,
                pdfContent:
                    pdfBuffer?.toString("base64")
            }
        }
    );

    return result.document;
}

export async function deleteDocument(id) {
    return callBitrix(
        "crm.documentgenerator.document.delete",
        { id }
    );
}

export async function addTimelineFile(
    dealId,
    fileName,
    fileBuffer,
    comment
) {
    return callBitrix(
        "crm.timeline.comment.add",
        {
            fields: {
                ENTITY_ID: Number(dealId),
                ENTITY_TYPE: "deal",
                COMMENT: comment,
                FILES: [
                    [
                        fileName,
                        fileBuffer.toString("base64")
                    ]
                ]
            }
        }
    );
}

export async function updateDealFileField(
    dealId,
    fieldCode,
    fileName,
    fileBuffer
) {
    const response = await fetch(
        `${canonicalBitrixRestUrl()}/crm.item.update.json`,
        {
            method: "POST",
            headers: {
                "Content-Type":
                    "application/json",
                Accept:
                    "application/json"
            },
            body:
                JSON.stringify({
                    entityTypeId: 2,
                    id: Number(dealId),
                    fields: {
                        [fieldCode]: [
                            fileName,
                            fileBuffer.toString("base64")
                        ]
                    }
                })
        }
    );

    return parseResponse(response);
}

export async function getListElement({
    iblockId,
    elementId
}) {
    const result = await callBitrix("lists.element.get", {
        IBLOCK_TYPE_ID: "lists",
        IBLOCK_ID: iblockId,
        ELEMENT_ID: elementId
    });

    if (!Array.isArray(result) || !result.length) {
        return null;
    }

    return result[0];
}

export async function downloadBuffer(url) {
    if (!url) {
        return null;
    }

    const absoluteUrl = url.startsWith("http")
        ? url
        : `${config.bitrixPortalUrl}${url.startsWith("/") ? "" : "/"}${url}`;

    const response = await fetch(absoluteUrl);

    if (!response.ok) {
        throw new Error(
            `Cannot download file ${response.status}: ${absoluteUrl}`
        );
    }

    return Buffer.from(await response.arrayBuffer());
}
