import path from "node:path";
import { loadEnv } from "./env.js";

loadEnv();

const required = [
    "BITRIX_PORTAL_URL",
    "BITRIX_REST_URL",
    "EVENT_SECRET"
];

for (const name of required) {
    if (!process.env[name]) {
        throw new Error(`Missing environment variable: ${name}`);
    }
}

export const config = {
    port: Number(process.env.PORT || 3012),

    bitrixPortalUrl: process.env.BITRIX_PORTAL_URL.replace(/\/$/, ""),
    bitrixRestUrl: process.env.BITRIX_REST_URL.replace(/\/$/, ""),

    eventSecret: process.env.EVENT_SECRET,

    realEstateEntityTypeId: Number(
        process.env.REAL_ESTATE_ENTITY_TYPE_ID || 1050
    ),

    allowedCategories: new Set([
        Number(process.env.CATEGORY_LONG_TERM ?? 0),
        Number(process.env.CATEGORY_SHORT_TERM ?? 2),
        Number(process.env.CATEGORY_SALE ?? 4)
    ]),

    templateFile: path.resolve(
        process.env.TEMPLATE_FILE || "templates/stanford-teaser.docx"
    ),

    templates: {
        52: {
            name: "Basic selection",
            fieldTitle: "Options sent to the client in basic selection",
            outputField: "ufCrm_1786538585163"
        },

        54: {
            name: "Extended selection",
            fieldTitle: "Options sent to the client - Extended selection",
            outputField: "ufCrm_1786538605604"
        },

        56: {
            name: "Individual selection",
            fieldTitle: "Options sent to the client - Individual selection",
            outputField: "ufCrm_1786538632588"
        }
    }
};

export const propertyFields = {
    referenceId: "id",
    typeUnit: "UF_CRM_10_1755761194858",
    unitNumber: "UF_CRM_10_1760545925770",
    serviceType: "UF_CRM_10_1755761690260",
    floor: "UF_CRM_10_1761146482925",

    mainPicture: "UF_CRM_10_1758029801951",
    pic1: "UF_CRM_10_1755760243298",
    pic2: "UF_CRM_10_1785948862378",
    pic3: "UF_CRM_10_1785958506726",

    price: "opportunity",
    priceCurrency: "currencyId",

    category: "UF_CRM_10_1760689671",
    region: "UF_CRM_10_1758624652",
    settlement: "UF_CRM_10_1758624683",

    complexName: "UF_CRM_10_1755762303589",

    unitArea: "UF_CRM_10_1755761806327",
    landArea: "UF_CRM_10_1755761444015",

    bedrooms: "UF_CRM_10_1755761500171",
    bedroomsEnSuite: "UF_CRM_10_1755761858873",
    bathrooms: "UF_CRM_10_1755761872341",

    acBedroom: "UF_CRM_10_1755775903386",
    privatePool: "UF_CRM_10_1755776243191",
    parkingSpaces: "UF_CRM_10_1755776215720",
    gatedComplex: "UF_CRM_10_1786368745679",
    listingNameForWebsite: "UF_CRM_10_1785767920316",

    office: "UF_CRM_10_1755776312227",
    laundry: "UF_CRM_10_1755776318708",
    secondKitchen: "UF_CRM_10_1755776291537",

    wifi: "UF_CRM_10_1755776038760",
    dishwasher: "UF_CRM_10_1755776018553",
    acLivingRoom: "UF_CRM_10_1755775894352",

    commonPool: "UF_CRM_10_1755775790071",
    gym: "UF_CRM_10_1755775767515",
    security: "UF_CRM_10_1755775753204"
};

export const listIds = {
    category: 38,
    region: 28,
    settlement: 30
};

export const enums = {
    typeUnit: {
        1496: "Apartment",
        1494: "Penthouse",
        1498: "Villa",
        1502: "Duplex",
        1932: "Triplex",
        1500: "Townhouse",
        1930: "Office",
        1934: "Commercial property",
        1922: "Land for locals only",
        1924: "Land, foreigners can buy"
    },

    serviceType: {
        1534: "Rent",
        1536: "Sale",
        1538: "Resale",
        1540: "Short-term rent",
        1542: "Occupation permit"
    },

    floor: {
        1862: "Ground Floor",
        1864: "1st Floor",
        1866: "2nd Floor",
        1868: "3d Floor",
        1870: "Villa 1 Floor",
        1872: "Villa 2 Floors"
    },

    security: {
        1560: "CCTV",
        1562: "Guardian",
        1564: "Automatic gates",
        1566: "Fence"
    }
};
