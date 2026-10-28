import {
    enums,
    listIds,
    propertyFields
} from "../config.js";

import {
    getCrmItem,
    getListElement
} from "../bitrix.js";

const listCache = new Map();

function printable(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "-";
    }

    return String(value);
}

function yesNo(value) {
    if (value === "Y" || value === true) {
        return "Yes";
    }

    if (value === "N" || value === false) {
        return "No";
    }

    return printable(value);
}

function pricePrintable(
    amount,
    currency
) {
    if (
        amount === null ||
        amount === undefined ||
        amount === ""
    ) {
        return "-";
    }

    const number =
        Number(amount);

    const formattedAmount =
        Number.isFinite(number)
            ? new Intl.NumberFormat(
                "ru-RU",
                {
                    maximumFractionDigits: 0
                }
            ).format(number)
            : amount;

    return [
        formattedAmount,
        currency
    ]
        .filter(Boolean)
        .join(" ");
}

function enumValue(map, value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "-";
    }

    return map[value] ?? String(value);
}

async function listValue(iblockId, id) {
    if (!id) {
        return "-";
    }

    const key = `${iblockId}:${id}`;

    if (listCache.has(key)) {
        return listCache.get(key);
    }

    try {
        const item = await getListElement({
            iblockId,
            elementId: Number(id)
        });

        const name = item?.NAME || String(id);

        listCache.set(key, name);

        return name;
    } catch {
        return String(id);
    }
}

async function multipleListValues(
    iblockId,
    values
) {
    if (!Array.isArray(values) || !values.length) {
        return "-";
    }

    const resolved = await Promise.all(
        values.map((id) => listValue(iblockId, id))
    );

    return resolved.join(", ");
}

async function complexName(item) {
    const explicit =
        item[propertyFields.complexName];

    if (explicit) {
        return String(explicit);
    }

    if (!item.parentId1058) {
        return "-";
    }

    try {
        const complex = await getCrmItem(
            1058,
            Number(item.parentId1058)
        );

        return complex?.title || "-";
    } catch {
        return "-";
    }
}

function securityValue(value) {
    if (!Array.isArray(value) || !value.length) {
        return "-";
    }

    return value
        .map((id) => enums.security[id] ?? String(id))
        .join(", ");
}

export async function buildPropertyValues(item) {
    return {
        referenceId: printable(
            item[propertyFields.referenceId]
        ),

        propertyType: enumValue(
            enums.typeUnit,
            item[propertyFields.typeUnit]
        ),

        unitNumber: printable(
            item[propertyFields.unitNumber]
        ),

        serviceType: enumValue(
            enums.serviceType,
            item[propertyFields.serviceType]
        ),

        floor: enumValue(
            enums.floor,
            item[propertyFields.floor]
        ),

        pricePrintable: pricePrintable(
            item[propertyFields.price],
            item[propertyFields.priceCurrency]
        ),

        category: await multipleListValues(
            listIds.category,
            item[propertyFields.category]
        ),

        region: await listValue(
            listIds.region,
            item[propertyFields.region]
        ),

        settlement: await listValue(
            listIds.settlement,
            item[propertyFields.settlement]
        ),

        complex: await complexName(item),

        unitArea: printable(
            item[propertyFields.unitArea]
        ),

        landArea: printable(
            item[propertyFields.landArea]
        ),

        bedrooms: printable(
            item[propertyFields.bedrooms]
        ),

        bedroomsEnSuite: printable(
            item[propertyFields.bedroomsEnSuite]
        ),

        bathrooms: printable(
            item[propertyFields.bathrooms]
        ),

        acBedroom: yesNo(
            item[propertyFields.acBedroom]
        ),

        privatePool: yesNo(
            item[propertyFields.privatePool]
        ),

        gatedComplex: yesNo(
            item[propertyFields.gatedComplex]
        ),

        parkingSpaces: yesNo(
            item[propertyFields.parkingSpaces]
        ),

        listingNameForWebsite: printable(
            item[propertyFields.listingNameForWebsite]
        ),

        office: yesNo(
            item[propertyFields.office]
        ),

        laundry: yesNo(
            item[propertyFields.laundry]
        ),

        secondKitchen: yesNo(
            item[propertyFields.secondKitchen]
        ),

        wifi: yesNo(
            item[propertyFields.wifi]
        ),

        dishwasher: yesNo(
            item[propertyFields.dishwasher]
        ),

        acLivingRoom: yesNo(
            item[propertyFields.acLivingRoom]
        ),

        commonPool: yesNo(
            item[propertyFields.commonPool]
        ),

        gym: yesNo(
            item[propertyFields.gym]
        ),

        security: securityValue(
            item[propertyFields.security]
        )
    };
}
