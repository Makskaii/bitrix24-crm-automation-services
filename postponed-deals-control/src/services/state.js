import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";

function emptyState() {
    return { cycles: {} };
}

function readState() {
    if (!fs.existsSync(config.stateFile)) {
        return emptyState();
    }

    const state = JSON.parse(fs.readFileSync(config.stateFile, "utf8"));
    return state && typeof state === "object" && state.cycles
        ? state
        : emptyState();
}

function writeState(state) {
    fs.mkdirSync(path.dirname(config.stateFile), { recursive: true });
    const temporaryFile = `${config.stateFile}.tmp`;
    fs.writeFileSync(temporaryFile, JSON.stringify(state, null, 2));
    fs.renameSync(temporaryFile, config.stateFile);
}

export function cycleKey(dealId, sourceStageId) {
    return `${dealId}:${sourceStageId}`;
}

export function getCycle(dealId, sourceStageId) {
    return readState().cycles[cycleKey(dealId, sourceStageId)] || null;
}

export function listCycles() {
    return Object.values(readState().cycles);
}

export function saveCycle(cycle) {
    const state = readState();
    state.cycles[cycleKey(cycle.dealId, cycle.sourceStageId)] = cycle;
    writeState(state);
}

export function removeCycle(dealId, sourceStageId) {
    const state = readState();
    delete state.cycles[cycleKey(dealId, sourceStageId)];
    writeState(state);
}
