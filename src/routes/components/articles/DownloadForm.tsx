
import React, { useState } from 'react';
import { ArticleDownload, DownloadData } from './types/types.ts';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

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
    const [editData, setEditData] = useState<{ name: string; url: string; isActive: boolean; }>({ name: '', url: '', isActive: true });

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
        handleChange({ target: { name: 'downloadName', value: '' } } as React.ChangeEvent<HTMLInputElement>);
        handleChange({ target: { name: 'downloadUrl', value: '' } } as React.ChangeEvent<HTMLInputElement>);
        handleChange({ target: { name: 'isActive', checked: true, type: 'checkbox' } } as React.ChangeEvent<HTMLInputElement>);
    };

    const startEdit = (download: LocalDownload) => {
        setEditingId(download.id);
        setEditData({ name: download.name, url: download.url, isActive: download.isActive });
    };

    const saveEdit = () => {
        if (editingId) {
            onEditLocal(editingId, { ...editData, isNew: true });
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
            <Card>
                <CardHeader>
                    <CardTitle>เพิ่มลิงค์ดาวน์โหลด</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="downloadName">ชื่อไฟล์</Label>
                        <Input id="downloadName" name="downloadName" value={downloadData.downloadName} onChange={handleChange} placeholder="เช่น Setup_Game_v1.0.exe" disabled={isLoading} />
                    </div>
                    <div>
                        <Label htmlFor="downloadUrl">URL ดาวน์โหลด</Label>
                        <Input id="downloadUrl" name="downloadUrl" value={downloadData.downloadUrl} onChange={handleChange} placeholder="https://example.com/download/file.exe" disabled={isLoading} />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="isActive" name="isActive" checked={downloadData.isActive} onCheckedChange={(checked) => handleChange({ target: { name: 'isActive', checked, type: 'checkbox' } } as any)} disabled={isLoading} />
                        <Label htmlFor="isActive">เปิดใช้งาน</Label>
                    </div>
                    <Button type="button" onClick={handleAddLocal} disabled={isLoading}>เพิ่มลิงค์</Button>
                </CardContent>
            </Card>

            <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">ลิงค์ดาวน์โหลดที่เพิ่ม ({localDownloads.length})</h3>
                {localDownloads.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p>ยังไม่มีลิงค์ดาวน์โหลด</p>
                        <p className="text-sm">เพิ่มลิงค์ด้านบนเพื่อเริ่มต้น</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {localDownloads.map((download) => (
                            <Card key={download.id}>
                                <CardContent className="p-4">
                                    {editingId === download.id ? (
                                        <div className="space-y-3">
                                            <div>
                                                <Label>ชื่อไฟล์</Label>
                                                <Input value={editData.name} onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))} />
                                            </div>
                                            <div>
                                                <Label>URL</Label>
                                                <Input value={editData.url} onChange={(e) => setEditData(prev => ({ ...prev, url: e.target.value }))} />
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox checked={editData.isActive} onCheckedChange={(checked) => setEditData(prev => ({ ...prev, isActive: !!checked }))} />
                                                <Label>เปิดใช้งาน</Label>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button onClick={saveEdit} size="sm">บันทึก</Button>
                                                <Button onClick={cancelEdit} variant="ghost" size="sm">ยกเลิก</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <h4 className="font-medium text-lg">{download.name}</h4>
                                                <p className="text-sm text-gray-600 break-all">{download.url}</p>
                                            </div>
                                            <div className="flex gap-2 ml-4">
                                                <Button onClick={() => startEdit(download)} variant="ghost" size="sm" disabled={isLoading}>แก้ไข</Button>
                                                <Button onClick={() => onDeleteLocal(download.id)} variant="destructive" size="sm" disabled={isLoading}>ลบ</Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {downloadLinks.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">ลิงค์ที่บันทึกแล้ว ({downloadLinks.length})</h3>
                    <div className="space-y-3">
                        {downloadLinks.map((download) => (
                            <Card key={download.id}>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h4 className="font-medium text-lg">{download.name}</h4>
                                            <p className="text-sm text-gray-600 break-all">{download.url}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex justify-between mt-6">
                <Button onClick={onPrevious} variant="secondary" disabled={isLoading}>ก่อนหน้า</Button>
                <Button onClick={onNext} disabled={isLoading}>ถัดไป ({localDownloads.length} รายการรอบันทึก)</Button>
            </div>
        </div>
    );
};

export default DownloadForm;
