
/**
 * Utility to safely import ES modules on Windows by converting paths to file:// URLs.
 * Works with both absolute and relative paths (relative to current file's import.meta.url).
 */
export function safeImport(modulePath: string, currentFileUrl: string) {
    const url = new URL(modulePath, currentFileUrl);
    return import(url.href);
}
