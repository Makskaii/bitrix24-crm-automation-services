import { config } from "../config.js";
import {
    createVisitActivity,
    createVisitCalendarEvent,
    getCompany,
    getContact,
    getDeal,
    markVisitScheduled
} from "../bitrix.js";
import { logger } from "../logger.js";

function value(object, ...keys) {
    for (const key of keys) {
        if (object?.[key] !== undefined && object[key] !== null) {
            return object[key];
        }
    }

    return null;
}

function validateInterval(dateStart, dateEnd) {
    const startTimestamp = Date.parse(dateStart);
    const endTimestamp = Date.parse(dateEnd);

    if (!Number.isFinite(startTimestamp) || !Number.isFinite(endTimestamp)) {
        throw new Error("Visit start or end is not a valid datetime");
    }

    if (endTimestamp <= startTimestamp) {
        throw new Error("Visit end must be later than visit start");
    }
}

async function getClientCommunication(deal) {
    const companyId = value(deal, "COMPANY_ID", "companyId");

    if (Number(companyId)) {
        const company = await getCompany(companyId);
        const name = String(value(company, "TITLE", "title") || "").trim();

        if (name) {
            return { VALUE: name, ENTITY_ID: Number(companyId), ENTITY_TYPE_ID: 4 };
        }
    }

    const contactId = value(deal, "CONTACT_ID", "contactId");

    if (Number(contactId)) {
        const contact = await getContact(contactId);
        const name = [value(contact, "NAME", "name"), value(contact, "LAST_NAME", "lastName")]
            .filter(Boolean)
            .join(" ")
            .trim();

        if (name) {
            return { VALUE: name, ENTITY_ID: Number(contactId), ENTITY_TYPE_ID: 3 };
        }
    }

    throw new Error("Deal does not contain a linked client with a name");
}

export async function scheduleVisit(dealId) {
    const id = String(dealId);
    let stage = "deal_load";
    let activityId = null;
    let calendarEventId = null;

    try {
        const deal = await getDeal(id);
        const dateStart = value(deal, config.visitStartField);
        const dateEnd = value(deal, config.visitEndField);
        const comment = String(value(deal, "COMMENTS", "comments") || "");
        const responsibleId = value(deal, "ASSIGNED_BY_ID", "assignedById");

        validateInterval(dateStart, dateEnd);

        if (!Number(responsibleId)) {
            throw new Error("Deal does not contain ASSIGNED_BY_ID");
        }

        stage = "client_load";
        const communication = await getClientCommunication(deal);
        const subject = `Просмотр квартиры с ${communication.VALUE}`;

        stage = "crm_activity_create";
        activityId = await createVisitActivity({
            dealId: id,
            responsibleId,
            dateStart,
            dateEnd,
            comment,
            communication,
            subject
        });

        if (config.createSeparateCalendarEvent) {
            stage = "calendar_event_create";
            calendarEventId = await createVisitCalendarEvent({
                dealId: id,
                responsibleId,
                dateStart,
                dateEnd,
                comment,
                subject
            });
        }

        stage = "deal_update";
        await markVisitScheduled(id);

        logger.info("visit_scheduled", {
            dealId: id,
            responsibleId: Number(responsibleId),
            activityId,
            calendarEventId,
            dateStart,
            dateEnd
        });

        return { status: "completed", activityId, calendarEventId };
    } catch (error) {
        logger.error("visit_scheduling_failed", {
            dealId: id,
            stage,
            activityId,
            calendarEventId,
            restMethod: error?.method || null,
            error: error?.message || String(error)
        });
        throw error;
    }
}
