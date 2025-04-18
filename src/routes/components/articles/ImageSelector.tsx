
import React from 'react';

interface ImageSelectorProps {
    label: string;
    imageUrl: string;
    imagePath?: string;
    imagePaths?: string[];
    name: string;
    selectType: 'mainImageFile' | 'additionalImageFiles';
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleFileSelect: (name: 'mainImageFile' | 'additionalImageFiles') => Promise<void>;
    placeholder: string;
    isDisabled: boolean;
    isMultiple?: boolean;
    required?: boolean;
}

const ImageSelector: React.FC<ImageSelectorProps> = ({
                                                         label,
                                                         imageUrl,
                                                         imagePath,
                                                         imagePaths = [],
                                                         name,
                                                         selectType,
                                                         handleChange,
                                                         handleFileSelect,
                                                         placeholder,
                                                         isDisabled,
                                                         isMultiple = false,
                                                         required = false,
                                                     }) => {
    return (
        <div className="form-control space-y-2">
            <label className="label">{label}</label>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => handleFileSelect(selectType)}
                    className="btn btn-outline btn-sm"
                >
                    เลือก{isMultiple ? 'รูปภาพเพิ่มเติม' : 'รูปภาพ'}
                </button>
                <input
                    type="text"
                    name={name}
                    value={imageUrl}
                    onChange={handleChange}
                    disabled={isDisabled}
                    placeholder={placeholder}
                    className="input input-bordered input-sm flex-1"
                    required={required}
                />
            </div>
            {imagePath && <p className="text-xs text-gray-500">Selected: {imagePath}</p>}
            {isMultiple && imagePaths.length > 0 && (
                <ul className="text-xs text-gray-500 list-disc list-inside">
                    {imagePaths.map((file, index) => (
                        <li key={index}>{file}</li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default ImageSelector;