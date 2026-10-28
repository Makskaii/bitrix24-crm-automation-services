import {
    getActivity,
    getDeal,
    markDealEmailSent
} from "../bitrix.js";

import { logger } from "../logger.js";

function value(object, key) {
    return object?.[key] ?? object?.[key.toLowerCase()] ?? null;
}

function findDealId(activity) {
    if (Number(value(activity, "OWNER_TYPE_ID")) === 2) {
        return value(activity, "OWNER_ID");
    }

    const bindings = value(activity, "BINDINGS") || [];

    for (const binding of bindings) {
        if (Number(value(binding, "OWNER_TYPE_ID")) === 2) {
            return value(binding, "OWNER_ID");
        }
    }

    return null;
}

function isOutgoingEmailCandidate(activity) {
    return (
        Number(value(activity, "DIRECTION")) === 2 &&
        Number(value(activity, "TYPE_ID")) === 4 &&
        String(
            value(activity, "PROVIDER_ID") || ""
        ).toUpperCase() === "CRM_EMAIL"
    );
}

function activityDiagnostics(activity) {
    return {
        id: value(activity, "ID"),
        typeId: value(activity, "TYPE_ID"),
        direction: value(activity, "DIRECTION"),
        ownerTypeId: value(activity, "OWNER_TYPE_ID"),
        ownerId: value(activity, "OWNER_ID"),
        completed: value(activity, "COMPLETED"),
        responsibleId: value(activity, "RESPONSIBLE_ID"),
        authorId: value(activity, "AUTHOR_ID"),
        communications: value(activity, "COMMUNICATIONS"),
        bindings: value(activity, "BINDINGS"),
        subject: value(activity, "SUBJECT"),
        description: value(activity, "DESCRIPTION")
    };
}

function dealDiagnostics(deal) {
    return {
        id: value(deal, "ID"),
        stageId: value(deal, "STAGE_ID") || value(deal, "stageId"),
        categoryId: value(deal, "CATEGORY_ID") || value(deal, "categoryId"),
        responsibleId:
            value(deal, "ASSIGNED_BY_ID") ||
            value(deal, "assignedById"),
        contactId: value(deal, "CONTACT_ID") || value(deal, "contactId"),
        companyId: value(deal, "COMPANY_ID") || value(deal, "companyId")
    };
}

export async function processActivityEvent({ activityId, payload }) {
    let dealId = null;
    let restMethod = "crm.activity.get";

    try {
        logger.info("Activity event received", {
            activityId,
            payload
        });

        const activity = await getActivity(activityId);

        logger.info("Activity loaded", {
            activityId,
            activity,
            diagnostics: activityDiagnostics(activity)
        });

        dealId = findDealId(activity);

        if (!dealId) {
            logger.info("Activity ignored: not linked to deal", {
                activityId
            });

            return;
        }

        restMethod = "crm.item.get";
        const deal = await getDeal(dealId);

        logger.info("Deal loaded for activity", {
            activityId,
            deal: dealDiagnostics(deal)
        });

        if (!isOutgoingEmailCandidate(activity)) {
            return;
        }

        logger.info("Outgoing email candidate detected", {
            activityId,
            dealId,
            diagnostics: activityDiagnostics(activity)
        });

        restMethod = "crm.item.update";
        await markDealEmailSent(dealId);

        logger.info("Deal email flag set", {
            activityId,
            dealId,
            field: "UF_CRM_1786632827958",
            value: "Yes"
        });
    } catch (error) {
        logger.error("Activity processing failed", {
            activityId,
            dealId,
            restMethod,
            error: error?.stack || error?.message || String(error)
        });
    }
}
