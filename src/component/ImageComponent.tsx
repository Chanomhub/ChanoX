import { generateImgproxyUrl } from '../utils/imgproxy';

interface ImageComponentProps {
    src: string;
    alt: string;
    width: number;
    height: number;
    quality?: number;
    className?: string; // Add className as an optional prop
}

const ImageComponent: React.FC<ImageComponentProps> = ({ src, alt, width, height, quality = 60, className }) => {
    const imgProxyUrl = generateImgproxyUrl(src, {
        width,
        height,
        quality
    });

    return (
        <img
            src={imgProxyUrl}
            alt={alt}
            className={className} // Pass the className prop to the img element
        />
    );
};

export default ImageComponent;