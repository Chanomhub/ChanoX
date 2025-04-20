
import React from 'react';
import { DownloadData } from './types';
import DownloadLinksList from './DownloadLinksList';

interface DownloadFormProps {
    downloadData: DownloadData;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    handleSubmit: () => Promise<void>;
    downloadLinks: any[];
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
        <div className="space-y-6 max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">
                ขั้นตอน 2: เพิ่มลิงค์ดาวน์โหลด (สามารถสร้างได้หลายลิงค์)
            </h2>
            <div className="card bg-base-100 shadow-lg p-6">
                <div className="form-control mb-4">
                    <label className="label">ชื่อลิงค์</label>
                    <input
                        type="text"
                        name="downloadName"
                        value={downloadData.downloadName}
                        onChange={handleChange}
                        className="input input-bordered"
                        required
                    />
                </div>
                <div className="form-control mb-4">
                    <label className="label">URL</label>
                    <input
                        type="text"
                        name="downloadUrl"
                        value={downloadData.downloadUrl}
                        onChange={handleChange}
                        className="input input-bordered"
                        required
                    />
                </div>
                <div className="form-control mb-4">
                    <label className="cursor-pointer label">
                        <span className="label-text">Active</span>
                        <input
                            type="checkbox"
                            name="isActive"
                            checked={downloadData.isActive}
                            onChange={handleChange}
                            className="checkbox checkbox-primary"
                        />
                    </label>
                </div>
                <div className="flex justify-between">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
                        disabled={isLoading}
                    >
                        {isLoading ? 'กำลังส่ง...' : 'สร้างลิงค์ดาวน์โหลด'}
                    </button>
                    <button type="button" onClick={onNext} className="btn btn-secondary">
                        เสร็จสิ้น
                    </button>
                </div>
            </div>
            {downloadLinks.length > 0 && <DownloadLinksList links={downloadLinks} />}
            <div className="flex justify-start mt-4">
                <button type="button" onClick={onPrevious} className="btn btn-outline">
                    กลับแก้ไขบทความ
                </button>
            </div>
        </div>
    );
};

export default DownloadForm;