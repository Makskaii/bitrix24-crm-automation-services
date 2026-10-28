import fs from "node:fs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { config } from "../config.js";

const stamp = fs.readFileSync(config.signatureImage);

function dateText() {
    return new Intl.DateTimeFormat("ru-RU").format(new Date());
}

export async function signPdf(input) {
    const document = await PDFDocument.load(input);
    const image = await document.embedPng(stamp);
    const font = await document.embedFont(StandardFonts.Helvetica);
    const date = dateText();

    for (const page of document.getPages()) {
        const { width, height } = page.getSize();
        const maxWidth = Math.min(110, width * 0.22);
        const maxHeight = Math.min(110, height * 0.16);
        const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
        const imageWidth = image.width * scale;
        const imageHeight = image.height * scale;
        const right = 28.35;
        const bottom = 72;

        page.drawImage(image, {
            x: Math.max(0, width - right - imageWidth),
            y: Math.max(18, bottom - 8),
            width: imageWidth,
            height: imageHeight
        });

        page.drawText(date, {
            x: Math.max(0, width - right - imageWidth),
            y: Math.max(8, bottom - 20),
            size: 9,
            font,
            color: rgb(0, 0, 0)
        });
    }

    return Buffer.from(await document.save());
}
