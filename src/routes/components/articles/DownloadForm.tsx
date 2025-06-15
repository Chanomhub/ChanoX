import React, { useState } from 'react';
import { ArticleDownload, DownloadData } from './types';

interface LocalDownload {
    id: string; // temporary ID for local state
    name: string;
    url: string;
    isActive: boolean;
    isNew: boolean; // flag to indicate it's not yet saved to server
}

interface DownloadFormProps {
    downloadData: DownloadData;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    handleSubmit: () => void;
    downloadLinks: ArticleDownload[];
    localDownloads: LocalDownload[]; // new prop for local downloads
    onAddLocal: (download: Omit<LocalDownload, 'id'>) => void; // new prop
    onEditLocal: (id: string, download: Omit<LocalDownload, 'id'>) => void; // new prop
    onDeleteLocal: (id: string) => void; // new prop
    isLoading: boolean;
    onPrevious: () => void;
    onNext: () => void;
}

const DownloadForm: React.FC<DownloadFormProps> = ({
                                                       downloadData,
                                                       handleChange,
                                                       downloadLinks,
                                                       localDownloads,
                                                       onAddLocal,
                                                       onEditLocal,
                                                       onDeleteLocal,
                                                       isLoading,
                                                       onPrevious,
                                                       onNext,
                                                   }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<{
        name: string;
        url: string;
        isActive: boolean;
    }>({ name: '', url: '', isActive: true });

    const handleAddLocal = () => {
        if (!downloadData.downloadName.trim() || !downloadData.downloadUrl.trim()) {
            alert('กรุณากรอกชื่อและ URL ให้ครบถ้วน');
            return;
        }

        onAddLocal({
            name: downloadData.downloadName,
            url: downloadData.downloadUrl,
            isActive: downloadData.isActive,
            isNew: true,
        });

        // Reset form
        handleChange({
            target: { name: 'downloadName', value: '' }
        } as React.ChangeEvent<HTMLInputElement>);
        handleChange({
            target: { name: 'downloadUrl', value: '' }
        } as React.ChangeEvent<HTMLInputElement>);
        handleChange({
            target: { name: 'isActive', checked: true, type: 'checkbox' }
        } as React.ChangeEvent<HTMLInputElement>);
    };

    const startEdit = (download: LocalDownload) => {
        setEditingId(download.id);
        setEditData({
            name: download.name,
            url: download.url,
            isActive: download.isActive,
        });
    };

    const saveEdit = () => {
        if (editingId) {
            onEditLocal(editingId, {
                ...editData,
                isNew: true,
            });
            setEditingId(null);
            setEditData({ name: '', url: '', isActive: true });
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditData({ name: '', url: '', isActive: true });
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-semibold mb-4">เพิ่มลิงค์ดาวน์โหลด</h2>

            {/* Add New Download Form */}
            <div className="bg-base-100 p-4 rounded-lg border mb-6">
                <h3 className="text-lg font-medium mb-3">เพิ่มลิงค์ใหม่</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">ชื่อไฟล์</label>
                        <input
                            type="text"
                            name="downloadName"
                            value={downloadData.downloadName}
                            onChange={handleChange}
                            className="input input-bordered w-full"
                            placeholder="เช่น Setup_Game_v1.0.exe"
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">URL ดาวน์โหลด</label>
                        <input
                            type="text"
                            name="downloadUrl"
                            value={downloadData.downloadUrl}
                            onChange={handleChange}
                            className="input input-bordered w-full"
                            placeholder="https://example.com/download/file.exe"
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
                            <span>เปิดใช้งาน</span>
                        </label>
                    </div>
                    <button
                        type="button"
                        onClick={handleAddLocal}
                        className="btn btn-primary"
                        disabled={isLoading}
                    >
                        เพิ่มลิงค์
                    </button>
                </div>
            </div>

            {/* Local Downloads List */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">
                    ลิงค์ดาวน์โหลดที่เพิ่ม ({localDownloads.length})
                </h3>
                {localDownloads.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p>ยังไม่มีลิงค์ดาวน์โหลด</p>
                        <p className="text-sm">เพิ่มลิงค์ด้านบนเพื่อเริ่มต้น</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {localDownloads.map((download) => (
                            <div key={download.id} className="p-4 bg-base-200 rounded-lg">
                                {editingId === download.id ? (
                                    // Edit Mode
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">ชื่อไฟล์</label>
                                            <input
                                                type="text"
                                                value={editData.name}
                                                onChange={(e) => setEditData(prev => ({
                                                    ...prev,
                                                    name: e.target.value
                                                }))}
                                                className="input input-bordered w-full input-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">URL</label>
                                            <input
                                                type="text"
                                                value={editData.url}
                                                onChange={(e) => setEditData(prev => ({
                                                    ...prev,
                                                    url: e.target.value
                                                }))}
                                                className="input input-bordered w-full input-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={editData.isActive}
                                                    onChange={(e) => setEditData(prev => ({
                                                        ...prev,
                                                        isActive: e.target.checked
                                                    }))}
                                                    className="checkbox checkbox-sm"
                                                />
                                                <span className="text-sm">เปิดใช้งาน</span>
                                            </label>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={saveEdit}
                                                className="btn btn-success btn-sm"
                                            >
                                                บันทึก
                                            </button>
                                            <button
                                                onClick={cancelEdit}
                                                className="btn btn-ghost btn-sm"
                                            >
                                                ยกเลิก
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    // View Mode
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-medium text-lg">{download.name}</h4>
                                                <span className={`badge badge-sm ${
                                                    download.isActive ? 'badge-success' : 'badge-error'
                                                }`}>
                                                    {download.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                                                </span>
                                                {download.isNew && (
                                                    <span className="badge badge-warning badge-sm">
                                                        ยังไม่บันทึก
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600 break-all">{download.url}</p>
                                        </div>
                                        <div className="flex gap-2 ml-4">
                                            <button
                                                onClick={() => startEdit(download)}
                                                className="btn btn-ghost btn-sm"
                                                disabled={isLoading}
                                            >
                                                แก้ไข
                                            </button>
                                            <button
                                                onClick={() => onDeleteLocal(download.id)}
                                                className="btn btn-error btn-sm"
                                                disabled={isLoading}
                                            >
                                                ลบ
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Existing Server Downloads (if any) */}
            {downloadLinks.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">
                        ลิงค์ที่บันทึกแล้ว ({downloadLinks.length})
                    </h3>
                    <div className="space-y-3">
                        {downloadLinks.map((download) => (
                            <div key={download.id} className="p-4 bg-green-50 rounded-lg border border-green-200">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-medium text-lg">{download.name}</h4>
                                            <span className={`badge badge-sm ${
                                                download.isActive ? 'badge-success' : 'badge-error'
                                            }`}>
                                                {download.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                                            </span>
                                            <span className="badge badge-success badge-sm">
                                                บันทึกแล้ว
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 break-all">{download.url}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-6">
                <button
                    onClick={onPrevious}
                    className="btn btn-secondary"
                    disabled={isLoading}
                >
                    ก่อนหน้า
                </button>
                <button
                    onClick={onNext}
                    className="btn btn-primary"
                    disabled={isLoading}
                >
                    ถัดไป ({localDownloads.length} รายการรอบันทึก)
                </button>
            </div>
        </div>
    );
};

export default DownloadForm;