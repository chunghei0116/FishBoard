import "server-only";

// Next.js uses server environment variables; Vinext retains native Worker bindings.
export const env = process.env;
