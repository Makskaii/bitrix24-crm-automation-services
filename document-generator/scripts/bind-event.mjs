import fs from "node:fs";

function loadEnv() {
    const text =
        fs.readFileSync(
            ".env",
            "utf8"
        );

    for (
        const line of text.split(/\r?\n/)
    ) {
        if (
            !line ||
            line.startsWith("#") ||
            !line.includes("=")
        ) {
            continue;
        }

        const index =
            line.indexOf("=");

        const key =
            line.slice(0, index).trim();

        const value =
            line.slice(index + 1).trim();

        if (
            process.env[key] === undefined
        ) {
            process.env[key] = value;
        }
    }
}

loadEnv();

const portal =
    process.env
        .BITRIX_PORTAL_URL
        .replace(/\/$/, "");

const token =
    process.env
        .BITRIX_OAUTH_ACCESS_TOKEN;

const handler =
    `${process.env.PUBLIC_HANDLER_URL}?secret=${encodeURIComponent(process.env.EVENT_SECRET)}`;

if (!token) {
    throw new Error(
        "BITRIX_OAUTH_ACCESS_TOKEN is empty"
    );
}

const response =
    await fetch(
        `${portal}/rest/event.bind.json`,
        {
            method: "POST",
            headers: {
                "Content-Type":
                    "application/json"
            },
            body: JSON.stringify({
                event:
                    "ONCRMDOCUMENTGENERATORDOCUMENTADD",

                handler,

                auth:
                    token
            })
        }
    );

const result =
    await response.json();

console.log(
    JSON.stringify(
        result,
        null,
        2
    )
);