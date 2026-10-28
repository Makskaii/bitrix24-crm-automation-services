export function escapeXml(value) {
    return String(value ?? "-")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&apos;");
}

function decodeXml(value) {
    return value
        .replaceAll("&amp;", "&")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&quot;", '"')
        .replaceAll("&apos;", "'");
}

function normalize(value) {
    return value
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function paragraphText(xml) {
    const matches = [
        ...xml.matchAll(
            /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g
        )
    ];

    return normalize(
        matches
            .map((match) => decodeXml(match[1]))
            .join("")
    );
}

export function textParagraph(value) {
    return [
        "<w:p>",
        "<w:r>",
        `<w:t xml:space="preserve">${escapeXml(value)}</w:t>`,
        "</w:r>",
        "</w:p>"
    ].join("");
}

function runText(xml) {
    const matches = [
        ...xml.matchAll(
            /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g
        )
    ];

    return matches
        .map((match) => decodeXml(match[1]))
        .join("");
}

export function valueRun(value) {
    return [
        "<w:r>",
        '<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:b w:val="0"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>',
        `<w:t xml:space="preserve">${escapeXml(value ?? "")}</w:t>`,
        "</w:r>"
    ].join("");
}

export function replaceRun(
    xml,
    placeholder,
    replacement
) {
    return xml.replace(
        /<w:r\b[^>]*>[\s\S]*?<\/w:r>/g,
        (run) =>
            runText(run) === placeholder
                ? replacement
                : run
    );
}

function replaceAcrossTextNodes(
    xml,
    placeholder,
    value
) {
    return xml.replace(
        /<w:p\b[^>]*>((?:(?!<w:p\b)[\s\S])*?)<\/w:p>/g,
        (paragraph) => {
            const nodes = [
                ...paragraph.matchAll(
                    /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g
                )
            ];

            const text = nodes
                .map((node) => decodeXml(node[1]))
                .join("");

            const start = text.indexOf(placeholder);

            if (start === -1) {
                return paragraph;
            }

            const end = start + placeholder.length;
            let offset = 0;
            let cursor = 0;
            let inserted = false;
            let result = "";

            for (const node of nodes) {
                const nodeText = decodeXml(node[1]);
                const nodeStart = offset;
                const nodeEnd = nodeStart + nodeText.length;
                const fullNode = node[0];

                offset = nodeEnd;

                let replacement = node[1];

                if (nodeEnd > start && nodeStart < end) {
                    const prefix = nodeText.slice(
                        0,
                        Math.max(0, start - nodeStart)
                    );
                    const suffix = nodeText.slice(
                        Math.min(nodeText.length, end - nodeStart)
                    );

                    replacement = [
                        escapeXml(prefix),
                        inserted ? "" : escapeXml(value ?? ""),
                        escapeXml(suffix)
                    ].join("");

                    inserted = true;
                }

                const openingEnd = fullNode.indexOf(">") + 1;
                const opening = fullNode.slice(0, openingEnd);
                const closing = "</w:t>";

                result += paragraph.slice(cursor, node.index);
                result += `${opening}${replacement}${closing}`;
                cursor = node.index + fullNode.length;
            }

            return result + paragraph.slice(cursor);
        }
    );
}

function replaceExactTextNodes(
    xml,
    placeholder,
    value
) {
    return xml.replace(
        /<w:t(\s[^>]*)?>([\s\S]*?)<\/w:t>/g,
        (node, attributes = "", text) =>
            decodeXml(text) === placeholder
                ? `<w:t${attributes}>${escapeXml(value ?? "")}</w:t>`
                : node
    );
}

export function resizeShapeSlot(
    xml,
    placeholder,
    width,
    height,
    top,
    fontSize
) {
    return xml.replace(
        /<mc:AlternateContent\b[^>]*>[\s\S]*?<\/mc:AlternateContent>/g,
        (alternateContent) => {
            if (!runText(alternateContent).includes(placeholder)) {
                return alternateContent;
            }

            let resized = alternateContent
                .replace(
                    /<wp:extent\s+cx="\d+"\s+cy="\d+"\/>/,
                    `<wp:extent cx="${width}" cy="${height}"/>`
                )
                .replace(
                    /<a:ext\s+cx="\d+"\s+cy="\d+"\/>/,
                    `<a:ext cx="${width}" cy="${height}"/>`
                )
                .replace(
                    /(style="[^"]*?)width:[\d.]+pt;/,
                    `$1width:${(width / 12700).toFixed(2)}pt;`
                )
                .replace(
                    /(style="[^"]*?)height:[\d.]+pt;/,
                    `$1height:${(height / 12700).toFixed(2)}pt;`
                );

            if (top !== undefined) {
                resized = resized
                    .replace(
                        /(<wp:positionV[^>]*><wp:posOffset>)-?\d+(<\/wp:posOffset><\/wp:positionV>)/,
                        `$1${top}$2`
                    )
                    .replace(
                        /(style="[^"]*?)margin-top:-?[\d.]+pt;/,
                        `$1margin-top:${(top / 12700).toFixed(2)}pt;`
                    );
            }

            if (fontSize !== undefined) {
                resized = resized
                    .replaceAll(
                        'w:sz w:val="24"',
                        `w:sz w:val="${fontSize}"`
                    )
                    .replaceAll(
                        'w:szCs w:val="24"',
                        `w:szCs w:val="${fontSize}"`
                    );
            }

            return resized;
        }
    );
}

export function replaceImageSlot(
    xml,
    placeholder,
    replacement,
    label
) {
    const adaptiveXml = relaxRows(
        xml,
        placeholder
    );
    const drawing = replacement
        .replace(/^<w:r\b[^>]*>/, "")
        .replace(/<\/w:r>$/, "");
    const alternateContentReplaced = adaptiveXml.replace(
        /<mc:AlternateContent\b[^>]*>[\s\S]*?<\/mc:AlternateContent>/g,
        (alternateContent) => {
            if (!runText(alternateContent).includes(placeholder)) {
                return alternateContent;
            }

            if (!replacement) {
                return "";
            }

            return drawing;
        }
    );

    if (alternateContentReplaced !== adaptiveXml) {
        return alternateContentReplaced;
    }

    return adaptiveXml.replace(
        /<w:p\b([^>]*)>([\s\S]*?)<\/w:p>/g,
        (paragraph, attributes, content) => {
            if (!runText(paragraph).includes(placeholder)) {
                return paragraph;
            }

            const properties =
                content.match(
                    /<w:pPr\b[\s\S]*?<\/w:pPr>/
                )?.[0] || "";

            return `<w:p${attributes}>${properties}${replacement}</w:p>`;
        }
    );
}

export function replaceNamedImage(
    xml,
    placeholder,
    replacementRelationshipId
) {
    return xml.replace(
        /<w:drawing\b[^>]*>[\s\S]*?<\/w:drawing>/g,
        (drawing) => {
            if (!drawing.includes(`name="${placeholder}"`)) {
                return drawing;
            }

            if (!replacementRelationshipId) {
                return "";
            }

            const imageReplaced = drawing.replace(
                /r:embed="[^"]+"/,
                `r:embed="${replacementRelationshipId}"`
            );

            if (placeholder !== "{{AGENT_PIC}}") {
                return imageReplaced;
            }

            return imageReplaced.replace(
                /(<wp:anchor\b[^>]*\brelativeHeight=")\d+"/,
                (_, prefix) =>
                    `${prefix}251658240"`
            );
        }
    );
}

export function namedImageExtent(
    xml,
    placeholder
) {
    for (const match of xml.matchAll(
        /<w:drawing\b[^>]*>[\s\S]*?<\/w:drawing>/g
    )) {
        const drawing = match[0];

        if (!drawing.includes(`name="${placeholder}"`)) {
            continue;
        }

        const extent = drawing.match(
            /<wp:extent\b[^>]*\/>/
        )?.[0];

        const cx = extent?.match(
            /\bcx="(\d+)"/
        )?.[1];
        const cy = extent?.match(
            /\bcy="(\d+)"/
        )?.[1];

        if (cx && cy) {
            return { cx, cy };
        }
    }

    return null;
}

function relaxRows(
    xml,
    placeholder
) {
    const rows = [];
    const stack = [];
    const tags = /<\/?w:tr\b[^>]*>/g;

    for (const tag of xml.matchAll(tags)) {
        const value = tag[0];
        const start = tag.index;
        const end = start + value.length;

        if (value.startsWith("</")) {
            const open = stack.pop();

            if (open) {
                rows.push({
                    start: open.end,
                    end: start
                });
            }

            continue;
        }

        stack.push({ end });
    }

    const removals = [];

    for (const row of rows) {
        const content = xml.slice(
            row.start,
            row.end
        );

        if (!runText(content).includes(placeholder)) {
            continue;
        }

        for (const height of content.matchAll(
            /<w:trHeight\b[^>]*\/>/g
        )) {
            const start = row.start + height.index;

            removals.push({
                start,
                end: start + height[0].length
            });
        }
    }

    if (!removals.length) {
        return xml;
    }

    removals.sort((left, right) =>
        left.start - right.start
    );

    let result = "";
    let cursor = 0;

    for (const removal of removals) {
        if (removal.start < cursor) {
            continue;
        }

        result += xml.slice(
            cursor,
            removal.start
        );

        cursor = removal.end;
    }

    return result + xml.slice(cursor);
}

export function replaceText(
    xml,
    placeholder,
    value
) {
    const adaptiveXml = relaxRows(
        xml,
        placeholder
    );

    const exactTextReplaced = replaceExactTextNodes(
        adaptiveXml,
        placeholder,
        value
    );

    if (exactTextReplaced !== adaptiveXml) {
        return exactTextReplaced;
    }

    const splitReplaced = replaceAcrossTextNodes(
        adaptiveXml,
        placeholder,
        value
    );

    if (splitReplaced !== adaptiveXml) {
        return splitReplaced;
    }

    const replacement = escapeXml(value ?? "");

    return adaptiveXml.replace(
        new RegExp(
            escapeRegExp(placeholder),
            "g"
        ),
        replacement
    );
}

export function replaceParagraphs(
    xml,
    label,
    replacement,
    replaceAll = false
) {
    const target = normalize(label);

    let replaced = 0;

    return xml.replace(
        /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g,
        (paragraph) => {
            if (
                paragraphText(paragraph) !== target
            ) {
                return paragraph;
            }

            if (!replaceAll && replaced > 0) {
                return paragraph;
            }

            replaced += 1;

            return replacement;
        }
    );
}

function escapeRegExp(value) {
    return String(value)
        .replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );
}

export function pageBreak() {
    return [
        "<w:p>",
        "<w:r>",
        '<w:br w:type="page"/>',
        "</w:r>",
        "</w:p>"
    ].join("");
}
