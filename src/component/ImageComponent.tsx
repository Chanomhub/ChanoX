import { generateCdnUrl } from '../utils/imgproxy';
import React from 'react';

interface ImageComponentProps {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    quality?: number;
    className?: string;
    onLoad?: () => void;
    onError?: () => void;
    loading?: 'lazy' | 'eager';
    style?: React.CSSProperties;
}

const ImageComponent: React.FC<ImageComponentProps> = ({
                                                           src,
                                                           alt,
                                                           width,
                                                           height,
                                                           quality = 80,
                                                           className,
                                                           onLoad,
                                                           onError,
                                                           loading = 'lazy',
                                                           style
                                                       }) => {
    const imgProxyUrl = generateCdnUrl(src, {
        width,
        height,
        quality
    });

    return (
        <img
            src={imgProxyUrl}
            alt={alt}
            width={width}
            height={height}
            className={className}
            onLoad={onLoad}
            onError={onError}
            loading={loading}
            style={style}
        />
    );
};

export default ImageComponent;