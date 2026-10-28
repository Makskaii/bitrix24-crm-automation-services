import { config } from "../config.js";
import {
    createFollowUpTask,
    getCompany,
    getContact,
    getDeal
} from "../bitrix.js";
import { logger } from "../logger.js";
import {
    getCycle,
    listCycles,
    removeCycle,
    saveCycle
} from "./state.js";

const processing = new Set();

function value(object, ...keys) {
    for (const key of keys) {
        if (object?.[key] !== undefined && object[key] !== null) {
            return object[key];
        }
    }

    return null;
}

function addCalendarDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function calculateNextCheckAt(date) {
    if (config.delayMinutes > 0) {
        return new Date(
            date.getTime() + config.delayMinutes * 60 * 1000
        ).toISOString();
    }

    return addCalendarDays(date, config.delayDays).toISOString();
}

function meta(dealId, deal) {
    return {
        dealId: String(dealId),
        categoryId: value(deal, "CATEGORY_ID", "categoryId"),
        stageId: value(deal, "STAGE_ID", "stageId")
    };
}

async function getClient(deal) {
    const companyId = value(deal, "COMPANY_ID", "companyId");

    if (Number(companyId)) {
        const company = await getCompany(companyId);
        return {
            name: String(value(company, "TITLE", "title") || `Company ${companyId}`),
            url: `${config.bitrixPortalUrl}/crm/company/details/${companyId}/`
        };
    }

    const contactId = value(deal, "CONTACT_ID", "contactId");

    if (Number(contactId)) {
        const contact = await getContact(contactId);
        const name = [
            value(contact, "NAME", "name"),
            value(contact, "LAST_NAME", "lastName"),
            value(contact, "SECOND_NAME", "secondName")
        ].filter(Boolean).join(" ");
        return {
            name: name || `Contact ${contactId}`,
            url: `${config.bitrixPortalUrl}/crm/contact/details/${contactId}/`
        };
    }

    return { name: "Not specified", url: null };
}

function taskDescription(dealId, deal, client) {
    const dealTitle = String(value(deal, "TITLE", "title") || `Deal ${dealId}`);
    const dealUrl = `${config.bitrixPortalUrl}/crm/deal/details/${dealId}/`;

    return [
        `Client: ${client.name}`,
        client.url,
        `Deal: ${dealTitle}`,
        "It is necessary to contact the client again.",
        "Deal:",
        dealUrl
    ].filter(Boolean).join("\n");
}

export async function startCycle(dealId) {
    const id = String(dealId);
    const deal = await getDeal(id);
    const stageId = String(value(deal, "STAGE_ID", "stageId") || "");
    const dealMeta = meta(id, deal);

    if (!config.allowedStages.has(stageId)) {
        logger.info("postponed_cycle_skipped", dealMeta);
        return { status: "skipped", stageId };
    }

    const existing = getCycle(id, stageId);

    if (existing) {
        logger.info("postponed_cycle_already_running", {
            ...dealMeta,
            nextCheckAt: existing.nextCheckAt
        });
        return { status: "already_running", nextCheckAt: existing.nextCheckAt };
    }

    const startedAt = new Date();
    const cycle = {
        dealId: id,
        sourceStageId: stageId,
        categoryId: dealMeta.categoryId,
        startedAt: startedAt.toISOString(),
        nextCheckAt: calculateNextCheckAt(startedAt)
    };

    saveCycle(cycle);
    logger.info("postponed_cycle_started", cycle);

    if (config.createTaskImmediately) {
        await processCycle(cycle);
    }

    const activeCycle = getCycle(id, stageId);

    return {
        status: "started",
        nextCheckAt: activeCycle?.nextCheckAt || cycle.nextCheckAt
    };
}

async function processCycle(cycle) {
    const key = `${cycle.dealId}:${cycle.sourceStageId}`;

    if (processing.has(key)) {
        return;
    }

    processing.add(key);

    try {
        const deal = await getDeal(cycle.dealId);
        const dealMeta = meta(cycle.dealId, deal);
        const currentStageId = String(dealMeta.stageId || "");

        if (currentStageId !== cycle.sourceStageId) {
            removeCycle(cycle.dealId, cycle.sourceStageId);
            logger.info("postponed_cycle_completed", {
                ...dealMeta,
                sourceStageId: cycle.sourceStageId
            });
            return;
        }

        const responsibleId = value(deal, "ASSIGNED_BY_ID", "assignedById");

        if (!Number(responsibleId)) {
            throw new Error("Deal does not contain ASSIGNED_BY_ID");
        }

        const client = await getClient(deal);
        const task = await createFollowUpTask({
            dealId: cycle.dealId,
            responsibleId,
            description: taskDescription(cycle.dealId, deal, client)
        });
        const nextCheckAt = calculateNextCheckAt(new Date());

        saveCycle({ ...cycle, nextCheckAt });
        logger.info("postponed_follow_up_task_created", {
            ...dealMeta,
            sourceStageId: cycle.sourceStageId,
            responsibleId: Number(responsibleId),
            taskId: task?.task?.id || task?.id || null,
            nextCheckAt
        });
    } catch (error) {
        logger.error("postponed_cycle_processing_failed", {
            dealId: cycle.dealId,
            sourceStageId: cycle.sourceStageId,
            restMethod: error?.method || null,
            error: error?.message || String(error)
        });
    } finally {
        processing.delete(key);
    }
}

export async function processDueCycles() {
    const now = Date.now();
    const cycles = listCycles().filter((cycle) => Date.parse(cycle.nextCheckAt) <= now);

    for (const cycle of cycles) {
        await processCycle(cycle);
    }
}

export function startScheduler() {
    processDueCycles().catch((error) => {
        logger.error("postponed_scheduler_failed", {
            error: error?.message || String(error)
        });
    });

    return setInterval(() => {
        processDueCycles().catch((error) => {
            logger.error("postponed_scheduler_failed", {
                error: error?.message || String(error)
            });
        });
    }, config.intervalMs);
}
