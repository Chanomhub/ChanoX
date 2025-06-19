import React from 'react';

interface ImageSelectorProps {
    label: string;
    imageUrl: string;
    imagePath?: string;
    imagePaths?: string[];
    name: string;
    selectType: 'mainImageFile' | 'additionalImageFiles' | 'backgroundImageFile' | 'coverImageFile';
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleFileSelect: (name: 'mainImageFile' | 'additionalImageFiles' | 'backgroundImageFile' | 'coverImageFile') => Promise<void>;
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
            <label className="flex items-center justify-between mb-2">
                <span className="text-base-content font-medium flex items-center gap-2">
                    <span className="text-warning">🖼️</span> {label}
                </span>
                <span className={`badge ${required ? 'badge-error' : 'badge-ghost'} badge-sm`}>
                    {required ? 'จำเป็น' : 'ไม่จำเป็น'}
                </span>
            </label>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => handleFileSelect(selectType)}
                    className="btn btn-outline btn-sm"
                    disabled={isDisabled}
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
            {/* Display selected file path and image preview for single image */}
            {imagePath && (
                <div className="mt-2">
                    <p className="text-xs text-gray-500">Selected: {imagePath}</p>
                    <img
                        src={imagePath}
                        alt="Selected image preview"
                        className="mt-2 max-w-[200px] h-auto rounded-lg border border-base-300"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none'; // Hide image if it fails to load
                        }}
                    />
                </div>
            )}
            {/* Display selected file paths and image previews for multiple images */}
            {isMultiple && imagePaths.length > 0 && (
                <div className="mt-2">
                    <p className="text-xs text-gray-500">Selected files:</p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        {imagePaths.map((file, index) => (
                            <div key={index}>
                                <p className="text-xs text-gray-500 truncate">{file}</p>
                                <img
                                    src={file}
                                    alt={`Additional image ${index + 1}`}
                                    className="max-w-[150px] h-auto rounded-lg border border-base-300"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none'; // Hide image if it fails to load
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageSelector;