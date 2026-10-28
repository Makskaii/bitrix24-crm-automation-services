import {
    getDealFields
} from "../bitrix.js";

let cache = null;

function fieldTitle(definition) {
    return (
        definition?.formLabel ||
        definition?.listLabel ||
        definition?.title ||
        ""
    );
}

async function fields() {
    if (!cache) {
        cache = await getDealFields();
    }

    return cache;
}

export async function findDealFieldCode(
    wantedTitle
) {
    const definitions =
        await fields();

    const wanted =
        wantedTitle.trim().toLowerCase();

    for (
        const [code, definition]
        of Object.entries(definitions)
    ) {
        if (
            fieldTitle(definition)
                .trim()
                .toLowerCase() === wanted
        ) {
            return code;
        }
    }

    throw new Error(
        `Deal field not found: ${wantedTitle}`
    );
}

export function extractRealEstateIds(
    value
) {
    const values =
        Array.isArray(value)
            ? value
            : value
                ? [value]
                : [];

    const result = [];

    for (const entry of values) {
        if (
            typeof entry === "number"
        ) {
            result.push(entry);
            continue;
        }

        if (
            typeof entry === "object" &&
            entry?.id
        ) {
            result.push(
                Number(entry.id)
            );
            continue;
        }

        const text =
            String(entry);

        const matches =
            text.match(/\d+/g);

        if (!matches?.length) {
            continue;
        }

        result.push(
            Number(matches.at(-1))
        );
    }

    return [
        ...new Set(
            result.filter(Number.isFinite)
        )
    ];
}