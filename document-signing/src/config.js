import path from "node:path";
import { loadEnv } from "./env.js";

loadEnv();

function universalFieldCode(value) {
    const fieldCode = String(value);
    const originalName = fieldCode.match(/^UF_CRM_(.+)$/i);

    if (originalName) {
        return `ufCrm_${originalName[1]}`;
    }

    const universalName = fieldCode.match(/^ufCrm_?(.*)$/i);

    return universalName
        ? `ufCrm_${universalName[1]}`
        : fieldCode;
}

function originalFieldCode(value) {
    const universalName = value.match(/^ufCrm_?(.*)$/i);

    return universalName
        ? `UF_CRM_${universalName[1]}`
        : value;
}

for (const name of ["BITRIX_PORTAL_URL", "BITRIX_REST_URL"]) {
    if (!process.env[name]) {
        throw new Error(`Missing environment variable: ${name}`);
    }
}

export const config = {
    port: Number(process.env.PORT || 3014),
    bitrixPortalUrl: process.env.BITRIX_PORTAL_URL.replace(/\/$/, ""),
    bitrixRestUrl: process.env.BITRIX_REST_URL.replace(/\/$/, ""),
    diskStorageId: Number(process.env.DISK_STORAGE_ID || 3),
    complianceRootFolder:
        process.env.COMPLIANCE_ROOT_FOLDER ||
        "COMPLIANCE TEMPLATES",
    signatureImage: path.resolve(
        process.env.SIGNATURE_IMAGE || "assets/signature-stamp.png"
    ),
    retryAttempts: Number(process.env.RETRY_ATTEMPTS || 3),
    retryDelayMs: Number(process.env.RETRY_DELAY_MS || 1000),
    dealProcessedField: universalFieldCode(
        process.env.DEAL_PROCESSED_FIELD ||
        "UF_CRM_1786959210011"
    ),
    dealProcessedReadField: originalFieldCode(
        universalFieldCode(
            process.env.DEAL_PROCESSED_FIELD ||
            "UF_CRM_1786959210011"
        )
    ),
    logDir: path.resolve("logs")
};

export const documentFields = {
    documentsOfClient: {
        "UF_CRM_1737625049595": "Passport / ID / Driving Licence",
        "UF_CRM_1737625062706": "Proof of Address",
        "UF_CRM_1784476682096": "Source of Funds",
        "UF_CRM_1737625104153": "Lease Agreement signed by both parties",
        "UF_CRM_1737625110737": "Invoice to Client",
        "UF_CRM_1784476350156": "Invoice to the Owner",
        "UF_CRM_1784475613670": "Invoice to the Owner"
    },
    complianceClient: {
        "UF_CRM_1783335417": "NameScan of Client",
        "UF_CRM_1787214567": "CRA of Client",
        "UF_CRM_1787214594": "CDD of Client",
        "UF_CRM_1787214624": "CDF of Client"
    },
    complianceOwner: {
        "UF_CRM_1784479856059": "NameScan of Owner",
        "UF_CRM_1787214688": "CRA of Owner",
        "UF_CRM_1784479872910": "CDF of Owner",
        "UF_CRM_1787214732": "CDD of Owner"
    },
    additionalClientDocuments: {
        "UF_CRM_1737631696959": "Resume",
        "UF_CRM_1737631712647": "Bank Statements",
        "UF_CRM_1737631723406": "Bank Reference Letter",
        "UF_CRM_1737631734334": "Certificate of No Criminal Record",
        "UF_CRM_1737631743886": "Name Change Certificate",
        "UF_CRM_1737625085506": "Source of Funds only 1 file",
        "UF_CRM_1737631802070": "CRP",
        "UF_CRM_1737631845645": "DEED OF SALE",
        "UF_CRM_1737625277456": "NameScan Report"
    }
};

export const signedDocumentFields = Object.assign({}, ...Object.values(documentFields));

export const requiredComplianceFields = Object.assign(
    {},
    documentFields.complianceClient,
    documentFields.complianceOwner
);
