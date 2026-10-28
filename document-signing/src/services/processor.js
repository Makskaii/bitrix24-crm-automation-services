import {
    config,
    requiredComplianceFields,
    signedDocumentFields
} from "../config.js";
import {
    addTimelineComment,
    getCompany,
    getContact,
    getDeal,
    updateDealProcessed
} from "../bitrix.js";
import { logger } from "../logger.js";
import { collectFiles, downloadPdf, signedFileName } from "./files.js";
import {
    getDealFolder,
    folderUrl,
    uploadWithNumberedName
} from "./disk.js";
import { signPdf } from "./pdf.js";
import { withRetry } from "./retry.js";

const processing = new Set();

function value(object, ...keys) {
    for (const key of keys) {
        if (object?.[key] !== undefined && object[key] !== null) {
            return object[key];
        }
    }

    return null;
}

function safeName(value, fallback) {
    const cleaned = String(value || fallback)
        .replace(/[\\/:*?"<>|]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return cleaned || fallback;
}

async function clientName(deal) {
    const companyId = value(deal, "COMPANY_ID", "companyId");

    if (Number(companyId)) {
        const company = await withRetry(() => getCompany(companyId));
        return safeName(
            value(company, "TITLE", "title"),
            `Company ${companyId}`
        );
    }

    const contactId = value(deal, "CONTACT_ID", "contactId");

    if (Number(contactId)) {
        const contact = await withRetry(() => getContact(contactId));
        const fullName = [
            value(contact, "NAME", "name"),
            value(contact, "LAST_NAME", "lastName"),
            value(contact, "SECOND_NAME", "secondName")
        ]
            .filter(Boolean)
            .join(" ");

        return safeName(fullName, `Contact ${contactId}`);
    }

    return safeName(
        value(deal, "COMPANY_TITLE", "companyTitle", "TITLE", "title"),
        "Client"
    );
}

function dealMeta(dealId, deal) {
    return {
        dealId,
        categoryId: value(deal, "CATEGORY_ID", "categoryId"),
        stageId: value(deal, "STAGE_ID", "stageId")
    };
}

function logFile(message, meta, candidate) {
    logger.info(message, {
        ...meta,
        fieldCode: candidate.fieldCode,
        fieldName: candidate.fieldName,
        fileId: candidate.fileId,
        fileName: candidate.fileName
    });
}

function hasFile(value) {
    return Array.isArray(value) ? value.some(Boolean) : Boolean(value);
}

function missingComplianceFields(deal) {
    return Object.entries(requiredComplianceFields)
        .filter(([fieldCode]) => !hasFile(deal[fieldCode]))
        .map(([fieldCode, fieldName]) => ({ fieldCode, fieldName }));
}

export async function processDeal(dealId) {
    const id = String(dealId);

    if (processing.has(id)) {
        return { status: "processing" };
    }

    processing.add(id);
    let currentFile = null;

    try {
        const deal = await withRetry(() => getDeal(id));
        const meta = dealMeta(id, deal);

        logger.info("deal_loaded", meta);

        if (String(deal[config.dealProcessedReadField] || "").trim()) {
            logger.info(`Already processed, skipping deal ${id}`, meta);
            return { status: "skipped" };
        }

        const missingFields = missingComplianceFields(deal);

        if (missingFields.length) {
            logger.info("required_compliance_fields_incomplete", {
                ...meta,
                missingFields
            });
            return { status: "incomplete_documents", missingFields };
        }

        const signed = [];

        for (const candidate of collectFiles(deal, signedDocumentFields)) {
            currentFile = candidate;
            logFile("field_scanned", meta, candidate);
            const downloaded = await withRetry(() => downloadPdf(candidate));

            if (downloaded.fileName) {
                candidate.fileName = downloaded.fileName;
            }

            if (!downloaded.isPdf) {
                logFile("file_skipped_non_pdf", meta, candidate);
                continue;
            }

            logFile("file_downloaded", meta, candidate);
            logFile("pdf_processing_started", meta, candidate);
            const buffer = await withRetry(() => signPdf(downloaded.buffer));
            logFile("pdf_signed", meta, candidate);
            signed.push({
                ...candidate,
                buffer,
                outputName: signedFileName(candidate.fileName)
            });
            currentFile = null;
        }

        if (!signed.length) {
            logger.info("no_documents", meta);
            return { status: "no_documents" };
        }

        const [client, dealName] = await Promise.all([
            clientName(deal),
            Promise.resolve(safeName(value(deal, "TITLE", "title"), `Deal ${id}`))
        ]);
        const folder = await withRetry(() => getDealFolder(client, dealName, {
            clientFound: () => logger.info("client_folder_found", meta),
            clientCreated: () => logger.info("client_folder_created", meta),
            dealFound: () => logger.info("deal_folder_found", meta),
            dealCreated: () => logger.info("deal_folder_created", meta)
        }));

        for (const document of signed) {
            const upload = await withRetry(() => uploadWithNumberedName(
                folder,
                document.outputName,
                document.buffer
            ));
            logFile("file_uploaded", {
                ...meta,
                outputName: upload.outputName
            }, document);
        }

        const url = folderUrl(folder);

        if (!url) {
            throw new Error("Bitrix.Disk folder does not provide DETAIL_URL");
        }

        await withRetry(() => addTimelineComment(
            id,
            `The documents contained signatures and seals; here is the link to the files: ${url}`
        ));
        logger.info("timeline_created", { ...meta, folderUrl: url });

        await withRetry(() => updateDealProcessed(id));

        const updatedDeal = await withRetry(() => getDeal(id));
        const processedValue = String(
            updatedDeal[config.dealProcessedReadField] || ""
        ).trim();

        if (processedValue.toLowerCase() !== "yes") {
            const error = new Error(
                "Bitrix did not persist the deal processed flag"
            );
            error.method = "crm.item.update";
            throw error;
        }

        logger.info("deal_marked_processed", meta);

        return { status: "completed", files: signed.length, folderUrl: url };
    } catch (error) {
        logger.error("document_processing_failed", {
            dealId: id,
            restMethod: error?.method || null,
            httpStatus: error?.status || null,
            responseBody: error?.responseBody || null,
            fieldCode: currentFile?.fieldCode || null,
            fileId: currentFile?.fileId || null,
            fileName: currentFile?.fileName || null,
            error: error?.message || String(error),
            stack: error?.stack || null
        });
        throw error;
    } finally {
        processing.delete(id);
    }
}
