import path from "node:path";
import { downloadFile } from "../bitrix.js";

function values(value) {
    if (!value) {
        return [];
    }

    return Array.isArray(value) ? value.filter(Boolean) : [value];
}

function fileUrl(file) {
    return file?.urlMachine || file?.url || file?.downloadUrl || null;
}

function fileName(file, index) {
    return file?.name || file?.NAME || `file-${index + 1}`;
}

function fileId(file) {
    return file?.id || file?.ID || null;
}

export function collectFiles(deal, fields) {
    return Object.entries(fields).flatMap(([fieldCode, fieldName]) =>
        values(deal[fieldCode]).map((file, index) => ({
            fieldCode,
            fieldName,
            file,
            fileId: fileId(file),
            fileName: fileName(file, index),
            url: fileUrl(file)
        }))
    );
}

export async function downloadPdf(candidate) {
    if (!candidate.url) {
        throw new Error("CRM file does not contain a download URL");
    }

    const downloaded = await downloadFile(candidate.url);
    const isPdf =
        downloaded.buffer.subarray(0, 5).toString("ascii") === "%PDF-";

    return {
        ...downloaded,
        isPdf
    };
}

export function signedFileName(name) {
    const parsed = path.parse(name);
    const base = parsed.name || "document";

    return `${base}_signed.pdf`.replace(/[\\/:*?"<>|]/g, "_");
}
