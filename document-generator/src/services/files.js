import {
    downloadBuffer
} from "../bitrix.js";

import {
    propertyFields
} from "../config.js";

function files(value) {
    if (!value) {
        return [];
    }

    if (Array.isArray(value)) {
        return value.filter(Boolean);
    }

    return [value];
}

function fileUrl(file) {
    return (
        file.urlMachine ||
        file.url ||
        null
    );
}

async function safeDownload(value) {
    const url = fileUrl(value);

    if (!url) {
        return null;
    }

    try {
        return await downloadBuffer(url);
    } catch {
        return null;
    }
}

async function downloadFiles(value) {
    const downloaded = await Promise.all(
        files(value).map(safeDownload)
    );

    return downloaded.filter(Boolean);
}

export async function getPropertyImages(item) {
    const [
        main,
        photos,
        secondPhotos,
        thirdPhotos
    ] = await Promise.all([
        safeDownload(
            item[propertyFields.mainPicture]
        ),

        downloadFiles(
            item[propertyFields.pic1]
        ),

        downloadFiles(
            item[propertyFields.pic2]
        ),

        downloadFiles(
            item[propertyFields.pic3]
        )
    ]);

    const gallery = [
        ...photos,
        ...secondPhotos,
        ...thirdPhotos
    ];

    return {
        main,
        pic1: gallery[0] || null,
        pic2: gallery[1] || null,
        pic3: gallery[2] || null
    };
}

export async function getAgentPhoto(user) {
    if (!user?.PERSONAL_PHOTO) {
        return null;
    }

    try {
        return await downloadBuffer(
            user.PERSONAL_PHOTO
        );
    } catch {
        return null;
    }
}
