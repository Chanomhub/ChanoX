import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useState, useEffect } from "react";
import { ArticleDownload } from "../components/articles/types/types.ts";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { message } from '@tauri-apps/plugin-dialog';

interface DownloadProgressEvent {
    downloadId: string;
    status: 'starting' | 'downloading' | 'completed' | 'failed';
    progress?: number;
    path?: string;
    error?: string;
}

export const ArticleDownloads: React.FC<{ downloads: ArticleDownload[] }> = ({ downloads }) => {
    const [downloadStatus, setDownloadStatus] = useState<{ [key: string]: string }>({});
    const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: number }>({});

    useEffect(() => {
        const unlisten = listen<DownloadProgressEvent>('download://progress', (event) => {
            const { downloadId, status, progress, error } = event.payload;

            setDownloadStatus((prev) => ({ ...prev, [downloadId]: status }));
            if (progress !== undefined) {
                setDownloadProgress((prev) => ({ ...prev, [downloadId]: progress }));
            }

            if (status === 'failed') {
                console.error(`Download ${downloadId} failed:`, error);
            }
        });

        return () => {
            unlisten.then(f => f());
        };
    }, []);

    const handleDownload = async (download: ArticleDownload) => {
        if (!download.isActive || download.status !== 'APPROVED') {
            return;
        }

        const downloadId = `article_download_${download.id}`;
        const lowerCaseName = download.name.toLowerCase();
        const isExternal = ['mega', 'jottacloud', 'mediafire', 'dropbox'].some(provider => lowerCaseName.includes(provider));

        if (isExternal) {
            // External link: Open in a new webview window
            try {

                const webview = new WebviewWindow(`download-${download.id}-${Date.now()}`, {
                    url: download.url,
                    title: `Downloading ${download.name}`,
                    width: 800,
                    height: 600,
                });

                webview.once('tauri://created', function () {
                    setDownloadStatus((prev) => ({ ...prev, [downloadId]: 'เปิดในหน้าต่างใหม่แล้ว' }));
                });
                webview.once('tauri://error', function (e) {
                    setDownloadStatus((prev) => ({ ...prev, [downloadId]: `เกิดข้อผิดพลาดในการเปิดหน้าต่าง: ${e.payload}` }));
                });
            } catch (error) {
                setDownloadStatus((prev) => ({ ...prev, [downloadId]: `เกิดข้อผิดพลาด: ${String(error)}` }));
            }
        } else {
            // Internal link: Use native download
            try {
                setDownloadStatus((prev) => ({ ...prev, [downloadId]: 'starting' }));
                setDownloadProgress((prev) => ({ ...prev, [downloadId]: 0 }));

                await invoke("download_file", {
                    downloadId,
                    url: download.url,
                    filename: download.name,
                });

            } catch (error) {
                setDownloadStatus((prev) => ({ ...prev, [downloadId]: `ข้อผิดพลาด: ${String(error)}` }));
            }
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
                        const status = downloadStatus[downloadId];
                        const progress = downloadProgress[downloadId];
                        const isNativeDownloading = status === 'starting' || status === 'downloading';
                        const isCompleted = status === 'completed';
                        const isWindowOpened = status === 'เปิดในหน้าต่างใหม่แล้ว';

                        let buttonText = 'ดาวน์โหลด';
                        if (isNativeDownloading) {
                            buttonText = `กำลังดาวน์โหลด... ${progress || 0}%`;
                        } else if (isCompleted) {
                            buttonText = 'ดาวน์โหลดเสร็จแล้ว';
                        } else if (isWindowOpened) {
                            buttonText = 'เปิดในหน้าต่างใหม่แล้ว';
                        }

                        return (
                            <div key={download.id} className="p-4 border rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-medium">{download.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        สถานะ: {status || 'พร้อมดาวน์โหลด'}
                                    </p>
                                    {isNativeDownloading && progress !== undefined && (
                                        <Progress value={progress} className="w-full mt-2" />
                                    )}
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => handleDownload(download)}
                                    disabled={isNativeDownloading || isCompleted || isWindowOpened}
                                >
                                    {buttonText}
                                </Button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};