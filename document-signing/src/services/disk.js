import { callBitrix } from "../bitrix.js";
import { config } from "../config.js";

function itemName(item) {
    return item?.NAME || item?.name || "";
}

function itemType(item) {
    return item?.TYPE || item?.type || "";
}

function itemId(item) {
    return item?.ID || item?.id;
}

async function children(parent) {
    if (parent.type === "storage") {
        return callBitrix("disk.storage.getchildren", { id: parent.id });
    }

    return callBitrix("disk.folder.getchildren", { id: parent.id });
}

async function findOrCreateFolder(parent, name, hooks) {
    const existing = (await children(parent)).find(
        (item) => itemType(item) === "folder" && itemName(item) === name
    );

    if (existing) {
        hooks?.found?.(existing);
        return existing;
    }

    const method = parent.type === "storage"
        ? "disk.storage.addfolder"
        : "disk.folder.addsubfolder";
    const created = await callBitrix(method, {
        id: parent.id,
        data: { NAME: name }
    });

    hooks?.created?.(created);
    return created;
}

export async function getDealFolder(clientName, dealName, hooks) {
    const root = await findOrCreateFolder(
        { type: "storage", id: config.diskStorageId },
        config.complianceRootFolder
    );
    const client = await findOrCreateFolder(
        { type: "folder", id: itemId(root) },
        clientName,
        {
            found: hooks.clientFound,
            created: hooks.clientCreated
        }
    );

    return findOrCreateFolder(
        { type: "folder", id: itemId(client) },
        dealName,
        {
            found: hooks.dealFound,
            created: hooks.dealCreated
        }
    );
}

function numberedName(name, index) {
    if (!index) {
        return name;
    }

    const dot = name.lastIndexOf(".");
    const base = dot > 0 ? name.slice(0, dot) : name;
    const extension = dot > 0 ? name.slice(dot) : "";

    return `${base} (${index})${extension}`;
}

export async function uploadWithNumberedName(folder, name, buffer) {
    const existingNames = new Set(
        (await children({ type: "folder", id: itemId(folder) }))
            .filter((item) => itemType(item) === "file")
            .map((item) => itemName(item).toLowerCase())
    );
    let index = 0;
    let outputName = numberedName(name, index);

    while (existingNames.has(outputName.toLowerCase())) {
        index += 1;
        outputName = numberedName(name, index);
    }

    const uploaded = await callBitrix("disk.folder.uploadfile", {
        id: itemId(folder),
        data: { NAME: outputName },
        fileContent: [outputName, buffer.toString("base64")],
        generateUniqueName: false
    });

    return {
        uploaded,
        outputName
    };
}

export function folderUrl(folder) {
    const url = folder?.DETAIL_URL || folder?.detailUrl || null;

    return url ? encodeURI(url) : null;
}
