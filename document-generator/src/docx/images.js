import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { logger } from "../logger.js";

const MAX_IMAGE_SIDE = 2560;
const IMAGE_MAX_BUFFER = 32 * 1024 * 1024;

function coverSize(width, height) {
    const ratio = width / height;

    if (ratio >= 1) {
        return {
            width: MAX_IMAGE_SIDE,
            height: Math.max(
                1,
                Math.round(MAX_IMAGE_SIDE / ratio)
            )
        };
    }

    return {
        width: Math.max(
            1,
            Math.round(MAX_IMAGE_SIDE * ratio)
        ),
        height: MAX_IMAGE_SIDE
    };
}

function imageType(buffer) {
    if (
        buffer?.[0] === 0xff &&
        buffer?.[1] === 0xd8
    ) {
        return {
            ext: "jpg",
            contentType: "image/jpeg"
        };
    }

    if (
        buffer?.slice(1, 4).toString() === "PNG"
    ) {
        return {
            ext: "png",
            contentType: "image/png"
        };
    }

    if (
        buffer?.slice(0, 3).toString() === "GIF"
    ) {
        return {
            ext: "gif",
            contentType: "image/gif"
        };
    }

    return {
        ext: "jpg",
        contentType: "image/jpeg"
    };
}

function imageDimensions(buffer) {
    if (
        buffer?.slice(1, 4).toString() === "PNG"
    ) {
        return {
            width: buffer.readUInt32BE(16),
            height: buffer.readUInt32BE(20)
        };
    }

    if (
        buffer?.[0] === 0xff &&
        buffer?.[1] === 0xd8
    ) {
        let offset = 2;

        while (offset < buffer.length - 8) {
            if (buffer[offset] !== 0xff) {
                offset += 1;
                continue;
            }

            const marker = buffer[offset + 1];
            const length = buffer.readUInt16BE(offset + 2);

            if (
                [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)
            ) {
                return {
                    height: buffer.readUInt16BE(offset + 5),
                    width: buffer.readUInt16BE(offset + 7)
                };
            }

            offset += 2 + length;
        }
    }

    return null;
}

function maxRelationId(xml) {
    let max = 0;

    for (
        const match of xml.matchAll(/Id="rId(\d+)"/g)
    ) {
        max = Math.max(
            max,
            Number(match[1])
        );
    }

    return max;
}

export class ImageManager {
    constructor(workDir) {
        this.workDir = workDir;

        this.relsPath = path.join(
            workDir,
            "word",
            "_rels",
            "document.xml.rels"
        );

        this.typesPath = path.join(
            workDir,
            "[Content_Types].xml"
        );

        this.rels = fs.readFileSync(
            this.relsPath,
            "utf8"
        );

        this.types = fs.readFileSync(
            this.typesPath,
            "utf8"
        );

        this.nextRid =
            maxRelationId(this.rels) + 1;

        this.nextDocPr = 5000;

        this.counter = 0;

        fs.mkdirSync(
            path.join(
                workDir,
                "word",
                "media"
            ),
            { recursive: true }
        );
    }

    add(buffer) {
        if (!buffer) {
            return null;
        }

        const type = imageType(buffer);

        this.counter += 1;

        const filename =
            `generated_${this.counter}.${type.ext}`;

        fs.writeFileSync(
            path.join(
                this.workDir,
                "word",
                "media",
                filename
            ),
            buffer
        );

        const rId =
            `rId${this.nextRid++}`;

        const relationship = [
            `<Relationship Id="${rId}"`,
            ' Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"',
            ` Target="media/${filename}"/>`
        ].join("");

        this.rels = this.rels.replace(
            "</Relationships>",
            `${relationship}</Relationships>`
        );

        if (
            !this.types.includes(
                `Extension="${type.ext}"`
            )
        ) {
            const defaultType =
                `<Default Extension="${type.ext}" ContentType="${type.contentType}"/>`;

            this.types = this.types.replace(
                "</Types>",
                `${defaultType}</Types>`
            );
        }

        return rId;
    }

    addCover(
        buffer,
        extent,
        placeholder
    ) {
        if (!buffer) {
            return null;
        }

        const width = Number(extent?.cx);
        const height = Number(extent?.cy);

        if (!width || !height) {
            logger.warn(
                "Image slot cleared: dimensions unavailable",
                { placeholder }
            );

            return null;
        }

        const target = coverSize(width, height);

        try {
            const prepared = execFileSync(
                "convert",
                [
                    "-",
                    "-auto-orient",
                    "-resize",
                    `${target.width}x${target.height}^`,
                    "-gravity",
                    "center",
                    "-crop",
                    `${target.width}x${target.height}+0+0`,
                    "+repage",
                    "-strip",
                    "-quality",
                    "90",
                    "jpeg:-"
                ],
                {
                    input: buffer,
                    maxBuffer: IMAGE_MAX_BUFFER
                }
            );

            return this.add(prepared);
        } catch (error) {
            logger.warn(
                "Image slot cleared: image processing failed",
                {
                    placeholder,
                    error: error?.message || String(error)
                }
            );

            return null;
        }
    }

    fitSize(
        buffer,
        maxWidth,
        maxHeight
    ) {
        const dimensions = imageDimensions(buffer);

        if (!dimensions?.width || !dimensions?.height) {
            return {
                width: maxWidth,
                height: maxHeight
            };
        }

        const scale = Math.min(
            maxWidth / dimensions.width,
            maxHeight / dimensions.height
        );

        return {
            width: dimensions.width * scale,
            height: dimensions.height * scale
        };
    }

    drawingRun(
        rId,
        widthInches,
        heightInches
    ) {
        if (!rId) {
            return null;
        }

        const cx =
            Math.round(widthInches * 914400);

        const cy =
            Math.round(heightInches * 914400);

        const id = this.nextDocPr++;

        return [
            "<w:r>",
            "<w:drawing>",
            '<wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0">',
            `<wp:extent cx="${cx}" cy="${cy}"/>`,
            `<wp:docPr id="${id}" name="Generated image ${id}"/>`,
            '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">',
            '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">',
            '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">',
            "<pic:nvPicPr>",
            `<pic:cNvPr id="${id}" name="Generated image ${id}"/>`,
            "<pic:cNvPicPr/>",
            "</pic:nvPicPr>",
            "<pic:blipFill>",
            `<a:blip r:embed="${rId}"/>`,
            "<a:stretch><a:fillRect/></a:stretch>",
            "</pic:blipFill>",
            "<pic:spPr>",
            "<a:xfrm>",
            '<a:off x="0" y="0"/>',
            `<a:ext cx="${cx}" cy="${cy}"/>`,
            "</a:xfrm>",
            '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>',
            "</pic:spPr>",
            "</pic:pic>",
            "</a:graphicData>",
            "</a:graphic>",
            "</wp:inline>",
            "</w:drawing>",
            "</w:r>"
        ].join("");
    }

    floatingDrawingRun(
        rId,
        widthInches,
        heightInches,
        leftInches,
        topInches
    ) {
        if (!rId) {
            return null;
        }

        const cx = Math.round(widthInches * 914400);
        const cy = Math.round(heightInches * 914400);
        const x = Math.round(leftInches * 914400);
        const y = Math.round(topInches * 914400);
        const id = this.nextDocPr++;

        return [
            "<w:r>",
            "<w:drawing>",
            '<wp:anchor xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251658240" behindDoc="1" locked="0" layoutInCell="1" allowOverlap="1">',
            '<wp:simplePos x="0" y="0"/>',
            `<wp:positionH relativeFrom="page"><wp:posOffset>${x}</wp:posOffset></wp:positionH>`,
            `<wp:positionV relativeFrom="page"><wp:posOffset>${y}</wp:posOffset></wp:positionV>`,
            `<wp:extent cx="${cx}" cy="${cy}"/>`,
            '<wp:effectExtent l="0" t="0" r="0" b="0"/>',
            "<wp:wrapNone/>",
            `<wp:docPr id="${id}" name="Generated image ${id}"/>`,
            "<wp:cNvGraphicFramePr/>",
            '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">',
            '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">',
            '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">',
            "<pic:nvPicPr>",
            `<pic:cNvPr id="${id}" name="Generated image ${id}"/>`,
            "<pic:cNvPicPr/>",
            "</pic:nvPicPr>",
            "<pic:blipFill>",
            `<a:blip r:embed="${rId}"/>`,
            "<a:stretch><a:fillRect/></a:stretch>",
            "</pic:blipFill>",
            "<pic:spPr>",
            "<a:xfrm>",
            '<a:off x="0" y="0"/>',
            `<a:ext cx="${cx}" cy="${cy}"/>`,
            "</a:xfrm>",
            '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>',
            "</pic:spPr>",
            "</pic:pic>",
            "</a:graphicData>",
            "</a:graphic>",
            "</wp:anchor>",
            "</w:drawing>",
            "</w:r>"
        ].join("");
    }

    save() {
        fs.writeFileSync(
            this.relsPath,
            this.rels
        );

        fs.writeFileSync(
            this.typesPath,
            this.types
        );
    }
}
