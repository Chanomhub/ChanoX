import { useState, useEffect } from "react";
import { ArticleDownload } from "../components/articles/types/types.ts";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { message } from '@tauri-apps/plugin-dialog';
import { open } from '@tauri-apps/plugin-shell';

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
    const [downloadPaths, setDownloadPaths] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        const setupListener = async () => {
            try {
                const unlisten = await listen<DownloadProgressEvent>('download://progress', async (event) => {
                    const { downloadId, status, progress, path, error } = event.payload;

                    console.log('Download progress event:', event.payload);

                    setDownloadStatus((prev) => ({ ...prev, [downloadId]: status }));

                    if (progress !== undefined) {
                        setDownloadProgress((prev) => ({ ...prev, [downloadId]: progress }));
                    }

                    if (status === 'completed' && path) {
                        setDownloadPaths((prev) => ({ ...prev, [downloadId]: path }));

                        await message(`ดาวน์โหลดสำเร็จ!\n\nไฟล์ถูกบันทึกที่:\n${path}`, {
                            title: 'ดาวน์โหลดสำเร็จ',
                            kind: 'info'
                        });
                    }

                    if (status === 'failed') {
                        console.error(`Download ${downloadId} failed:`, error);
                        await message(`เกิดข้อผิดพลาด: ${error || 'ไม่สามารถดาวน์โหลดได้'}`, {
                            title: 'ข้อผิดพลาด',
                            kind: 'error'
                        });
                    }
                });

                return unlisten;
            } catch (error) {
                console.error('Error setting up listener:', error);
            }
        };

        const unlistenPromise = setupListener();

        return () => {
            unlistenPromise.then(unlisten => unlisten && unlisten());
        };
    }, []);

    // ตรวจสอบว่าเป็น direct download link หรือไม่
    const isDirectDownloadLink = (url: string, name: string): boolean => {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase();
            const nameLower = name.toLowerCase();

            // File hosting services ที่ต้องเปิดในเบราว์เซอร์
            const browserRequired = [
                'mega.nz',
                'mega.co.nz',
                'mediafire.com',
                'dropbox.com',
                'drive.google.com',
                'onedrive.live.com',
                'jottacloud.com',
                'zippyshare.com',
                'uploaded.net',
                'rapidgator.net',
                'turbobit.net',
                '1fichier.com',
                'sendspace.com',
                'file.io',
            ];

            // ถ้าชื่อไฟล์บอกว่าเป็น service เหล่านี้
            const nameIndicators = ['mega', 'mediafire', 'dropbox', 'drive', 'jottacloud', 'ranoz'];
            if (nameIndicators.some(indicator => nameLower.includes(indicator))) {
                return false;
            }

            // ถ้า domain ตรงกับ file hosting
            if (browserRequired.some(domain => hostname.includes(domain))) {
                return false;
            }

            // Direct download patterns
            const directPatterns = [
                /^dl\./,
                /^download\./,
                /^cdn\./,
                /^files\./,
                /^static\./,
                /^assets\./,
            ];

            if (directPatterns.some(pattern => pattern.test(hostname))) {
                return true;
            }

            // ถ้า URL มีนามสกุลไฟล์ชัดเจน
            const path = urlObj.pathname;
            const fileExtensions = /\.(zip|rar|7z|tar|gz|bz2|xz|exe|msi|dmg|pkg|deb|rpm|apk|pdf|doc|docx|xls|xlsx|ppt|pptx|mp4|mkv|avi|mov|mp3|wav|flac|aac|jpg|jpeg|png|gif|webp|svg|iso|img)$/i;
            if (fileExtensions.test(path)) {
                return true;
            }

            return false;
        } catch {
            return false;
        }
    };

    const handleDownload = async (download: ArticleDownload) => {
        console.log('handleDownload called:', download);

        if (!download.isActive || download.status !== 'APPROVED') {
            console.log('Download not active or not approved');
            await message('ไฟล์นี้ไม่สามารถดาวน์โหลดได้', {
                title: 'ไม่สามารถดาวน์โหลด',
                kind: 'warning'
            });
            return;
        }

        const downloadId = `article_download_${download.id}`;
        const isDirect = isDirectDownloadLink(download.url, download.name);

        console.log('Download info:', {
            id: downloadId,
            name: download.name,
            url: download.url,
            isDirect
        });

        if (!isDirect) {
            // เปิดใน external browser สำหรับ file hosting services
            try {
                console.log('Opening in external browser:', download.url);
                await open(download.url);

                setDownloadStatus((prev) => ({ ...prev, [downloadId]: 'เปิดในเบราว์เซอร์แล้ว' }));

                await message(
                    `เปิดลิงก์ดาวน์โหลดในเบราว์เซอร์แล้ว\n\nไฟล์: ${download.name}\n\nกรุณาดาวน์โหลดไฟล์ในหน้าเว็บที่เปิดขึ้น`,
                    {
                        title: '📂 เปิดเบราว์เซอร์',
                        kind: 'info'
                    }
                );
            } catch (error) {
                console.error('Browser open error:', error);
                setDownloadStatus((prev) => ({ ...prev, [downloadId]: 'เกิดข้อผิดพลาด' }));
                await message(`เกิดข้อผิดพลาด: ${String(error)}`, {
                    title: 'ข้อผิดพลาด',
                    kind: 'error'
                });
            }
        } else {
            // ดาวน์โหลดผ่าน Rust backend สำหรับ direct links
            try {
                console.log('Starting direct download via Rust backend');
                setDownloadStatus((prev) => ({ ...prev, [downloadId]: 'starting' }));
                setDownloadProgress((prev) => ({ ...prev, [downloadId]: 0 }));

                await invoke("download_file", {
                    downloadId,
                    url: download.url,
                    filename: download.name,
                });

                console.log('Download invoked successfully');

            } catch (error) {
                const errorMsg = String(error);
                console.error('Download error:', error);
                setDownloadStatus((prev) => ({ ...prev, [downloadId]: 'failed' }));

                await message(`ข้อผิดพลาด: ${errorMsg}`, {
                    title: 'เกิดข้อผิดพลาด',
                    kind: 'error'
                });
            }
        }
    };

    const handleOpenFolder = async (downloadId: string) => {
        const path = downloadPaths[downloadId];
        if (path) {
            try {
                const folderPath = path.substring(0, path.lastIndexOf('/'));
                await open(folderPath);
            } catch (error) {
                console.error('Error opening folder:', error);
            }
        }
    };

    const handleCancel = async (downloadId: string) => {
        try {
            await invoke("cancel_download", { downloadId });
            setDownloadStatus((prev) => ({ ...prev, [downloadId]: 'cancelled' }));
        } catch (error) {
            console.error('Error cancelling download:', error);
        }
    };

    const getDownloadType = (download: ArticleDownload): 'direct' | 'browser' => {
        return isDirectDownloadLink(download.url, download.name) ? 'direct' : 'browser';
    };

    return (
        <div className="p-6">
            <h3 className="text-xl font-semibold mb-4">ไฟล์ดาวน์โหลด</h3>

            {/* Info banner */}
            <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg text-sm">
                <p className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <span>💡</span>
                    <span>คำแนะนำการใช้งาน</span>
                </p>
                <div className="space-y-2 text-xs text-blue-800">
                    <div className="flex items-start gap-2">
                        <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-medium mt-0.5">
                            ดาวน์โหลดตรง
                        </span>
                        <p>ดาวน์โหลดอัตโนมัติพร้อมแสดง progress bar</p>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-medium mt-0.5">
                            เปิดในเบราว์เซอร์
                        </span>
                        <p>สำหรับ Mediafire, Mega, Dropbox - กรุณาดาวน์โหลดในหน้าเว็บที่เปิดขึ้น</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {downloads.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">
                        <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                            </svg>
                        </div>
                        <p className="font-medium">ไม่มีไฟล์ดาวน์โหลด</p>
                    </div>
                ) : (
                    downloads.map((download) => {
                        const downloadId = `article_download_${download.id}`;
                        const status = downloadStatus[downloadId];
                        const progress = downloadProgress[downloadId];
                        const path = downloadPaths[downloadId];
                        const downloadType = getDownloadType(download);

                        const isDownloading = status === 'starting' || status === 'downloading';
                        const isCompleted = status === 'completed';
                        const isFailed = status === 'failed';
                        const isCancelled = status === 'cancelled';
                        const isBrowserOpened = status === 'เปิดในเบราว์เซอร์แล้ว';
                        const isInactive = !download.isActive || download.status !== 'APPROVED';

                        let buttonText = 'ดาวน์โหลด';
                        let statusText = 'พร้อมดาวน์โหลด';
                        let buttonDisabled = false;

                        if (isInactive) {
                            buttonText = 'ไม่พร้อมใช้งาน';
                            statusText = 'ไฟล์นี้ไม่สามารถดาวน์โหลดได้';
                            buttonDisabled = true;
                        } else if (isDownloading) {
                            buttonText = 'ยกเลิก';
                            statusText = `กำลังดาวน์โหลด (${Math.round(progress || 0)}%)`;
                            buttonDisabled = false;
                        } else if (isCompleted) {
                            buttonText = 'เปิดโฟลเดอร์';
                            statusText = `ดาวน์โหลดเสร็จแล้ว`;
                            buttonDisabled = false;
                        } else if (isFailed) {
                            buttonText = 'ลองอีกครั้ง';
                            statusText = 'ดาวน์โหลดล้มเหลว';
                            buttonDisabled = false;
                        } else if (isCancelled) {
                            buttonText = 'ดาวน์โหลดอีกครั้ง';
                            statusText = 'ยกเลิกแล้ว';
                            buttonDisabled = false;
                        } else if (isBrowserOpened) {
                            buttonText = 'เปิดอีกครั้ง';
                            statusText = 'เปิดในเบราว์เซอร์แล้ว - ดาวน์โหลดในหน้าต่างที่เปิดขึ้น';
                            buttonDisabled = false;
                        } else if (downloadType === 'browser') {
                            statusText = 'จะเปิดในเบราว์เซอร์';
                        }

                        return (
                            <div
                                key={download.id}
                                className="p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-all duration-200"
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <p className="font-medium truncate text-black">{download.name}</p>
                                            {downloadType === 'browser' && !isCompleted && (
                                                <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full whitespace-nowrap font-medium">
                                                    เปิดในเบราว์เซอร์
                                                </span>
                                            )}
                                            {downloadType === 'direct' && !isCompleted && !isBrowserOpened && (
                                                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full whitespace-nowrap font-medium">
                                                    ดาวน์โหลดตรง
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${
                                                isCompleted ? 'bg-green-500' :
                                                    isFailed ? 'bg-red-500' :
                                                        isCancelled ? 'bg-yellow-500' :
                                                            isBrowserOpened ? 'bg-purple-500' :
                                                                isDownloading ? 'bg-blue-500 animate-pulse' :
                                                                    'bg-gray-300'
                                            }`} />
                                            <p className="text-sm text-muted-foreground">
                                                {statusText}
                                            </p>
                                        </div>
                                        {path && (
                                            <p className="text-xs text-muted-foreground mt-2 truncate bg-gray-50 px-2 py-1 rounded" title={path}>
                                                📁 {path}
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            console.log('Button clicked for download:', download.id);
                                            if (isCompleted) {
                                                handleOpenFolder(downloadId);
                                            } else if (isDownloading) {
                                                handleCancel(downloadId);
                                            } else {
                                                handleDownload(download);
                                            }
                                        }}
                                        disabled={buttonDisabled}
                                        variant={
                                            isCompleted ? "outline" :
                                                isDownloading ? "destructive" :
                                                    "default"
                                        }
                                        className="whitespace-nowrap"
                                    >
                                        {buttonText}
                                    </Button>
                                </div>
                                {isDownloading && (
                                    <div className="mt-3">
                                        <Progress value={progress || 0} className="w-full h-2" />
                                        <div className="flex justify-between items-center mt-1">
                                            <p className="text-xs text-muted-foreground">
                                                กำลังดาวน์โหลด...
                                            </p>
                                            <p className="text-xs font-medium text-blue-600">
                                                {Math.round(progress || 0)}%
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};