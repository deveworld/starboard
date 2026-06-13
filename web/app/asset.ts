// Prefix static-asset URLs with the deploy base path.
// next.config basePath handles framework assets (/_next) and next/link|image,
// but raw <img src> and fetch()/loader URLs must be prefixed manually.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const asset = (path: string): string => `${BASE_PATH}${path}`;
