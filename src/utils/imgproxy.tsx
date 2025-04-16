// utils/imgproxy.ts
const baseUrl = 'https://resize.chanomhub.online';

export function generateImgproxyUrl(src: string, options: {
    width?: number,
    height?: number,
    quality?: number,
    format?: string // Will not use now, but kept for future
} = {}) {
    // Encode to base64url manually
    const encode = (str: string) => {
        const base64 = btoa(str); // Standard Base64 encoding
        return base64
            .replace(/\+/g, '-')  // Replace + with -
            .replace(/\//g, '_')  // Replace / with _
            .replace(/=+$/, '');  // Remove trailing = signs
    };

    let path = '';

    if (options.width || options.height) {
        const w = options.width || 0;
        const h = options.height || 0;
        path += `/resize:${w}:${h}`;
    }

    if (options.quality) {
        path += `/q:${options.quality}`;
    }

    const encodedUrl = encode(src);

    return `${baseUrl}${path}/${encodedUrl}`;
}