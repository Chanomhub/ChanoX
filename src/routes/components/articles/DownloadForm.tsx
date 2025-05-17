import React from 'react';
import { ArticleDownloads } from './../../download/ArticleDownloads.tsx';
import { DownloadData, ArticleDownload } from './types';

interface DownloadFormProps {
    downloadData: DownloadData;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    handleSubmit: () => void;
    downloadLinks: ArticleDownload[];
    isLoading: boolean;
    onPrevious: () => void;
    onNext: () => void;
}

const DownloadForm: React.FC<DownloadFormProps> = ({
                                                       downloadData,
                                                       handleChange,
                                                       handleSubmit,
                                                       downloadLinks,
                                                       isLoading,
                                                       onPrevious,
                                                       onNext,
                                                   }) => {
    return (
        <div className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Add Download Links</h2>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit();
                }}
                className="space-y-4"
            >
                <div>
                    <label className="block text-sm font-medium">Download Name</label>
                    <input
                        type="text"
                        name="downloadName"
                        value={downloadData.downloadName}
                        onChange={handleChange}
                        className="input input-bordered w-full"
                        placeholder="Enter download name"
                        disabled={isLoading}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium">Download URL</label>
                    <input
                        type="text"
                        name="downloadUrl"
                        value={downloadData.downloadUrl}
                        onChange={handleChange}
                        className="input input-bordered w-full"
                        placeholder="Enter download URL"
                        disabled={isLoading}
                    />
                </div>
                <div>
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            name="isActive"
                            checked={downloadData.isActive}
                            onChange={handleChange}
                            className="checkbox"
                            disabled={isLoading}
                        />
                        <span>Active</span>
                    </label>
                </div>
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isLoading}
                >
                    {isLoading ? 'Adding...' : 'Add Download'}
                </button>
            </form>

            <div className="mt-6">
                <ArticleDownloads downloads={downloadLinks} />
            </div>

            <div className="flex justify-between mt-6">
                <button
                    onClick={onPrevious}
                    className="btn btn-secondary"
                    disabled={isLoading}
                >
                    Previous
                </button>
                <button
                    onClick={onNext}
                    className="btn btn-primary"
                    disabled={isLoading}
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default DownloadForm;