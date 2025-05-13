import React from 'react';
import { DownloadData } from './types';

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
        <div className="bg-base-100 shadow-xl rounded-box p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">เพิ่มลิงก์ดาวน์โหลด</h2>
            <div className="mb-6">
                <div className="form-control mb-4">
                    <label className="label">
                        <span className="label-text">ชื่อไฟล์</span>
                    </label>
                    <input
                        type="text"
                        name="downloadName"
                        value={downloadData.downloadName}
                        onChange={handleChange}
                        className="input input-bordered w-full"
                        placeholder="ชื่อไฟล์หรือคำอธิบาย"
                    />
                </div>

                <div className="form-control mb-4">
                    <label className="label">
                        <span className="label-text">URL ดาวน์โหลด</span>
                    </label>
                    <input
                        type="text"
                        name="downloadUrl"
                        value={downloadData.downloadUrl}
                        onChange={handleChange}
                        className="input input-bordered w-full"
                        placeholder="ใส่ URL ของไฟล์ที่ต้องการให้ดาวน์โหลด"
                    />
                </div>

                <div className="form-control mb-4">
                    <label className="label cursor-pointer justify-start gap-4">
                        <input
                            type="checkbox"
                            name="isActive"
                            checked={downloadData.isActive}
                            onChange={handleChange}
                            className="checkbox"
                        />
                        <span className="label-text">เปิดใช้งานลิงก์ดาวน์โหลด</span>
                    </label>
                </div>

                <button
                    className="btn btn-primary mt-2"
                    onClick={handleSubmit}
                    disabled={isLoading || !downloadData.downloadName || !downloadData.downloadUrl}
                >
                    {isLoading ? "กำลังบันทึก..." : "เพิ่มลิงก์ดาวน์โหลด"}
                </button>
            </div>

            <div className="mt-6">
                <h3 className="text-xl font-semibold mb-4">ลิงก์ดาวน์โหลดที่เพิ่มแล้ว</h3>
                {downloadLinks.length === 0 ? (
                    <p className="text-base-content/70">ยังไม่มีลิงก์ดาวน์โหลด</p>
                ) : (
                    <div className="space-y-4">
                        {downloadLinks.map((link, index) => (
                            <div key={index} className="p-4 bg-base-200 rounded-lg">
                                <p className="font-medium">{link.name}</p>
                                <p className="text-sm truncate text-base-content/70">{link.url}</p>
                                <p className="text-sm">
                                    สถานะ: {link.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex justify-between mt-8">
                <button className="btn btn-outline" onClick={onPrevious}>
                    ย้อนกลับ
                </button>
                <button
                    className="btn btn-primary"
                    onClick={onNext}
                >
                    ถัดไป: สรุป
                </button>
            </div>
        </div>
    );
};

export default DownloadForm;