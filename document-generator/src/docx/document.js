import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { config } from "../config.js";
import { ImageManager } from "./images.js";
import {
    combinePages,
    renderPage
} from "./renderer.js";

const exec = promisify(execFile);

function bodyParts(xml) {
    const match = xml.match(
        /<w:body>([\s\S]*?)<\/w:body>/
    );

    if (!match) {
        throw new Error(
            "Cannot find w:body in template"
        );
    }

    let content = match[1];

    const sectionMatch = content.match(
        /<w:sectPr\b[\s\S]*?<\/w:sectPr>/
    );

    const section =
        sectionMatch?.[0] || "";

    if (sectionMatch) {
        content = content.replace(
            sectionMatch[0],
            ""
        );
    }

    const paragraphs = [
        ...content.matchAll(
            /<w:p(?:\s[^>]*)?>/g
        )
    ];

    const lastParagraph = paragraphs.at(-1);

    if (lastParagraph) {
        const trailingParagraph = content.slice(
            lastParagraph.index
        );
        const paragraphEnd = trailingParagraph.indexOf(
            "</w:p>"
        );
        const remainingContent = paragraphEnd === -1
            ? trailingParagraph
            : trailingParagraph.slice(
                paragraphEnd + "</w:p>".length
            );

        if (
            !/<w:(?:t|drawing|br|tab)\b/.test(
                trailingParagraph
            ) &&
            !remainingContent.trim()
        ) {
            content = content.slice(
                0,
                lastParagraph.index
            );
        }
    }

    return {
        content,
        section
    };
}

export async function buildDocx(records) {
    if (!records.length) {
        throw new Error(
            "No Real Estate records to generate"
        );
    }

    if (!fs.existsSync(config.templateFile)) {
        throw new Error(
            `Template does not exist: ${config.templateFile}`
        );
    }

    const workDir = path.join(
        os.tmpdir(),
        `stanford-${crypto.randomUUID()}`
    );

    const output = path.join(
        os.tmpdir(),
        `stanford-result-${crypto.randomUUID()}.docx`
    );

    fs.mkdirSync(
        workDir,
        { recursive: true }
    );

    try {
        await exec(
            "unzip",
            [
                "-q",
                config.templateFile,
                "-d",
                workDir
            ]
        );

        const wordDir = path.join(
            workDir,
            "word"
        );

        for (const file of fs.readdirSync(wordDir)) {
            if (!/^footer.*\.xml$/.test(file)) {
                continue;
            }

            const footerPath = path.join(wordDir, file);

            const footer = fs.readFileSync(
                footerPath,
                "utf8"
            );

            fs.writeFileSync(
                footerPath,
                footer.replaceAll(
                    "TEMPLATE_VERSION: STANFORD_TEASER_V1",
                    ""
                )
            );
        }

        const documentPath = path.join(
            workDir,
            "word",
            "document.xml"
        );

        let documentXml =
            fs.readFileSync(
                documentPath,
                "utf8"
            );

        const {
            content,
            section
        } = bodyParts(documentXml);

        const manager =
            new ImageManager(workDir);

        const pages = records.map(
            (record) =>
                renderPage({
                    source: content,
                    values: record.values,
                    images: record.images,
                    agent: record.agent,
                    manager
                })
        );

        manager.save();

        const newBody =
            `${combinePages(pages)}${section}`;

        documentXml =
            documentXml.replace(
                /<w:body>[\s\S]*?<\/w:body>/,
                `<w:body>${newBody}</w:body>`
            );

        fs.writeFileSync(
            documentPath,
            documentXml
        );

        await exec(
            "zip",
            [
                "-qr",
                output,
                "."
            ],
            {
                cwd: workDir
            }
        );

        return {
            path: output,
            buffer: fs.readFileSync(output)
        };
    } finally {
        fs.rmSync(
            workDir,
            {
                recursive: true,
                force: true
            }
        );
    }
}

function commandOutput(result) {
    return [
        result?.stdout,
        result?.stderr
    ]
        .filter(Boolean)
        .map((value) => String(value).trim())
        .filter(Boolean)
        .join(" | ")
        .slice(0, 2000);
}

function usePdfLineFallbacks(xml) {
    const tags = /<\/?mc:AlternateContent\b[^>]*>/g;
    const stack = [];
    const replacements = [];

    for (const tag of xml.matchAll(tags)) {
        const value = tag[0];
        const start = tag.index;
        const end = start + value.length;

        if (!value.startsWith("</")) {
            stack.push({ start, end });
            continue;
        }

        const opening = stack.pop();

        if (!opening || stack.length) {
            continue;
        }

        const block = xml.slice(
            opening.start,
            end
        );
        const choiceEnd = block.indexOf(
            "</mc:Choice>"
        );
        const fallbackStart = block.indexOf(
            "<mc:Fallback>"
        );
        const fallbackEnd = block.indexOf(
            "</mc:Fallback>"
        );

        if (
            choiceEnd === -1 ||
            fallbackStart === -1 ||
            fallbackEnd === -1 ||
            !block.slice(0, choiceEnd).includes(
                '<a:prstGeom prst="line"'
            )
        ) {
            continue;
        }

        replacements.push({
            start: opening.start,
            end,
            value: block.slice(
                fallbackStart + "<mc:Fallback>".length,
                fallbackEnd
            ).replace(
                /(<wp:anchor\b[^>]*\brelativeHeight=")\d+"/g,
                (_, prefix) =>
                    `${prefix}251658240"`
            )
        });
    }

    return replacements
        .sort((left, right) => right.start - left.start)
        .reduce(
            (result, replacement) =>
                result.slice(0, replacement.start) +
                replacement.value +
                result.slice(replacement.end),
            xml
        );
}

function raisePdfFooterIcons(xml) {
    const footerIcons = [
        "image21.png",
        "image22.png",
        "image35.png"
    ];

    return xml.replace(
        /<w:drawing\b[^>]*>[\s\S]*?<\/w:drawing>/g,
        (drawing) => {
            if (
                !footerIcons.some(
                    (name) => drawing.includes(
                        `name="${name}"`
                    )
                )
            ) {
                return drawing;
            }

            return drawing.replace(
                /(<wp:anchor\b[^>]*\brelativeHeight=")\d+"/,
                (_, prefix) =>
                    `${prefix}251658240"`
            );
        }
    );
}

async function buildPdfCompatibleDocx(
    sourcePath,
    conversionDir
) {
    const workDir = path.join(
        conversionDir,
        "document"
    );
    const outputPath = path.join(
        conversionDir,
        path.basename(sourcePath)
    );

    await exec(
        "unzip",
        [
            "-q",
            sourcePath,
            "-d",
            workDir
        ]
    );

    const documentPath = path.join(
        workDir,
        "word",
        "document.xml"
    );
    const documentXml = raisePdfFooterIcons(
        usePdfLineFallbacks(
            fs.readFileSync(
                documentPath,
                "utf8"
            )
        )
    );

    fs.writeFileSync(
        documentPath,
        documentXml
    );

    await exec(
        "zip",
        [
            "-qr",
            outputPath,
            "."
        ],
        {
            cwd: workDir
        }
    );

    return outputPath;
}

export async function convertDocxToPdf(docxPath) {
    const conversionDir = path.join(
        os.tmpdir(),
        `libreoffice-document-${crypto.randomUUID()}`
    );
    const profileDir = path.join(
        os.tmpdir(),
        `libreoffice-${crypto.randomUUID()}`
    );

    fs.mkdirSync(conversionDir, { recursive: true });
    fs.mkdirSync(profileDir, { recursive: true });

    try {
        const conversionDocx =
            await buildPdfCompatibleDocx(
                docxPath,
                conversionDir
            );
        const pdfPath = conversionDocx.replace(
            /\.docx$/i,
            ".pdf"
        );
        let conversion;

        try {
            conversion = await exec(
                "libreoffice",
                [
                    "--headless",
                    `-env:UserInstallation=file://${profileDir}`,
                    "--convert-to",
                    "pdf",
                    "--outdir",
                    conversionDir,
                    conversionDocx
                ]
            );
        } catch (error) {
            const output = commandOutput(error);

            throw new Error(
                `LibreOffice conversion failed (code ${error?.code ?? "unknown"})${
                    output ? `: ${output}` : ""
                }`
            );
        }

        if (!fs.existsSync(pdfPath)) {
            const output = commandOutput(conversion);

            throw new Error(
                `LibreOffice did not create PDF${
                    output ? `: ${output}` : ""
                }`
            );
        }

        return {
            path: pdfPath,
            buffer: fs.readFileSync(pdfPath)
        };
    } finally {
        fs.rmSync(profileDir, {
            recursive: true,
            force: true
        });
        fs.rmSync(conversionDir, {
            recursive: true,
            force: true
        });
    }
}
