const baseUrl = 'https://chanomhub.online';

/**
 * Detects if the URL is already CDN-processed
 */
function isCdnProcessedUrl(src: string): boolean {
    return src.includes('/cdn-cgi/image/');
}

/**
 * Generates URL for CDN with image parameters
 */
export function generateCdnUrl(src: string, options: {
    width?: number,
    height?: number,
    quality?: number,
    format?: string
} = {}): string {
    if (isCdnProcessedUrl(src)) {
        try {
            const [, cdnBase, paramStr, imagePath] = src.match(/^(https?:\/\/[^/]+)\/cdn-cgi\/image\/([^/]+)\/(.+)$/) || [];
            if (!cdnBase) return src;

            const paramsMap: Record<string, string> = {};
            paramStr.split(',').forEach(param => {
                const [key, value] = param.split('=');
                if (key && value) paramsMap[key] = value;
            });

            if (options.width) paramsMap['width'] = options.width.toString();
            if (options.height) paramsMap['height'] = options.height.toString();
            if (options.quality) paramsMap['quality'] = options.quality.toString();
            if (options.format) paramsMap['format'] = options.format;
            else if (!paramsMap['format']) paramsMap['format'] = 'auto';

            const newParams = Object.entries(paramsMap)
                .map(([key, value]) => `${key}=${value}`)
                .join(',');

            return `${cdnBase}/cdn-cgi/image/${newParams}/${encodeURIComponent(imagePath).replace(/'/g, '%27')}`;
        } catch (e) {
            console.error('Error updating CDN URL:', e);
            return src;
        }
    }

    try {
        const params = [
            options.width && `width=${options.width}`,
            options.height && `height=${options.height}`,
            options.quality && `quality=${options.quality}`,
            'format=auto'
        ].filter(Boolean).join(',');

        return `${baseUrl}/cdn-cgi/image/${params}/${encodeURIComponent(src).replace(/'/g, '%27')}`;
    } catch (e) {
        console.error('Error generating CDN URL:', e);
        return src;
    }
}