import { useState } from "react";
import { ArticleDownload } from "../components/articles/types/types.ts";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { open } from "@tauri-apps/plugin-shell";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import * as fs from "@tauri-apps/plugin-fs";
import { downloadDir, join } from '@tauri-apps/api/path';

export const ArticleDownloads: React.FC<{ downloads: ArticleDownload[] }> = ({ downloads }) => {
    const [downloadStatus, setDownloadStatus] = useState<{ [key: string]: string }>({});
    const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: number }>({});

    const handleDownload = async (download: ArticleDownload) => {
        if (!download.isActive || download.status !== 'APPROVED') return;

        const downloadId = `article_download_${download.id}`;
        try {
            setDownloadStatus((prev) => ({ ...prev, [downloadId]: 'กำลังเปิดเบราว์เซอร์...' }));
            setDownloadProgress((prev) => ({ ...prev, [downloadId]: 0 }));

            await open(download.url);

            setDownloadStatus((prev) => ({ ...prev, [downloadId]: `เปิดในเบราว์เซอร์แล้ว` }));
            setDownloadProgress((prev) => ({ ...prev, [downloadId]: 100 }));

        } catch (error) {
            console.error("Error opening external link:", error);
            setDownloadStatus((prev) => ({ ...prev, [downloadId]: `ข้อผิดพลาด: ${String(error)}` }));
        }
    };

    const handleMoveDownloadedFile = async (downloadId: string, suggestedFileName: string) => {
        try {
            const selectedPath = await openFileDialog({
                multiple: false,
                directory: false,
                title: `เลือกไฟล์ ${suggestedFileName} ที่ดาวน์โหลดแล้ว`,
            });

            if (selectedPath && typeof selectedPath === 'string') {
                setDownloadStatus((prev) => ({ ...prev, [downloadId]: 'กำลังย้ายไฟล์...' }));
                const appDownloadsPath = await downloadDir();
                const destinationPath = await join(appDownloadsPath, suggestedFileName);

                await fs.copyFile(selectedPath, destinationPath);
                await fs.removeFile(selectedPath);

                setDownloadStatus((prev) => ({ ...prev, [downloadId]: 'ย้ายไฟล์สำเร็จ' }));
            } else {
                setDownloadStatus((prev) => ({ ...prev, [downloadId]: 'ยกเลิกการย้ายไฟล์' }));
            }
        } catch (error) {
            console.error("Error moving file:", error);
            setDownloadStatus((prev) => ({ ...prev, [downloadId]: `ข้อผิดพลาดในการย้ายไฟล์: ${String(error)}` }));
        }
    };

    return (
        <div className="p-6">
            <h3 className="text-xl font-semibold mb-4">ไฟล์ดาวน์โหลด</h3>
            <div className="space-y-4">
                {downloads.length === 0 ? (
                    <p>ไม่มีไฟล์ดาวน์โหลด</p>
                ) : (
                    downloads.map((download) => {
                        const downloadId = `article_download_${download.id}`;
                        const isDownloading = downloadStatus[downloadId]?.includes('กำลังเปิดเบราว์เซอร์');

                        return (
                            <div key={download.id} className="p-4 border rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-medium">{download.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        สถานะ: {downloadStatus[downloadId] || 'พร้อมดาวน์โหลด'}
                                    </p>
                                    {downloadProgress[downloadId] > 0 && downloadProgress[downloadId] < 100 && (
                                        <Progress value={downloadProgress[downloadId]} className="w-full mt-2" />
                                    )}
                                </div>
                                <div className="flex space-x-2">
                                    <Button
                                        size="sm"
                                        onClick={() => handleDownload(download)}
                                        disabled={isDownloading}
                                    >
                                        {isDownloading ? 'กำลังเปิด...' : 'ดาวน์โหลด'}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleMoveDownloadedFile(downloadId, download.name)}
                                    >
                                        ย้ายไฟล์ที่ดาวน์โหลดแล้ว
                                    </Button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};