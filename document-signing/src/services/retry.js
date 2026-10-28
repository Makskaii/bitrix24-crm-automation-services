import { config } from "../config.js";

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry(action) {
    let lastError;

    for (let attempt = 1; attempt <= config.retryAttempts; attempt += 1) {
        try {
            return await action(attempt);
        } catch (error) {
            lastError = error;

            if (attempt < config.retryAttempts) {
                await delay(config.retryDelayMs);
            }
        }
    }

    throw lastError;
}
