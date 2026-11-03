// Shared with client components: keep this file free of server-only or heavy imports.
export const MAX_DOCUMENT_BYTES = 1024 * 1024;
/** PDFs carry layout and fonts: they may be bigger than the text they contain (kept under
 *  the 4 MB Server Action body limit of next.config.ts). */
export const MAX_PDF_BYTES = 2 * 1024 * 1024;
export const MAX_TITLE_LENGTH = 200;
