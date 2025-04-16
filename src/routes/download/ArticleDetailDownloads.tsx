import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface ArticleDownload {
    id: number;
    articleId: number;
    name: string;
    url: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface DownloadProgressState {
    [key: string]: {
        progress: number;
        status: 'pending' | 'downloading' | 'complete' | 'error';
        error?: string;
    };
}

interface ArticleDownloadsProps {
    downloads: ArticleDownload[];
}

const ArticleDownloads: React.FC<ArticleDownloadsProps> = ({ downloads }) => {
    const [downloadState, setDownloadState] = useState<DownloadProgressState>({});

    const formatDate = (timestamp: number | string) => {
        return new Date(timestamp).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatTime = (timestamp: number | string) => {
        return new Date(timestamp).toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    useEffect(() => {
        // Listen for download progress updates
        const progressUnlisten = listen('download-progress', (event) => {
            const { id, progress } = event.payload as { id: string; progress: number };

            setDownloadState((prev) => ({
                ...prev,
                [id]: {
                    ...prev[id],
                    progress,
                    status: progress >= 100 ? 'complete' : 'downloading',
                },
            }));
        });

        // Listen for download completion
        const completeUnlisten = listen('download-complete', (event) => {
            const { id } = event.payload as { id: string; filename: string; path: string };

            setDownloadState((prev) => ({
                ...prev,
                [id]: {
                    ...prev[id],
                    progress: 100,
                    status: 'complete',
                },
            }));
        });

        // Listen for download errors
        const errorUnlisten = listen('download-error', (event) => {
            const { id, error } = event.payload as { id: string; filename: string; error: string };

            setDownloadState((prev) => ({
                ...prev,
                [id]: {
                    ...prev[id],
                    status: 'error',
                    error,
                },
            }));
        });

        return () => {
            progressUnlisten.then(unlisten => unlisten());
            completeUnlisten.then(unlisten => unlisten());
            errorUnlisten.then(unlisten => unlisten());
        };
    }, []);

    const isSupportedProvider = (url: string): boolean => {
        return url.includes('mediafire.com') || url.includes('mega.nz') || url.includes('mega.io');
    };

    const handleDownload = async (download: ArticleDownload) => {
        if (!isSupportedProvider(download.url)) {
            // Copy URL to clipboard
            await navigator.clipboard.writeText(download.url);
            // Show alert
            alert('ลิงก์นี้ไม่รองรับปลั๊กอินดาวน์โหลด ลิงก์ถูกคัดลอกเรียบร้อยแล้ว คุณสามารถเปิดในเว็บได้');
            return;
        }

        try {
            // Generate a unique download ID
            const downloadId = `download_${download.id}_${Date.now()}`;

            // Set initial state
            setDownloadState((prev) => ({
                ...prev,
                [downloadId]: {
                    progress: 0,
                    status: 'pending',
                },
            }));

            // Start the download
            await invoke('download_from_url', {
                url: download.url,
            });

        } catch (error) {
            console.error('Failed to start download:', error);
        }
    };

    // Get provider name from URL
    const getProviderName = (url: string): string => {
        if (url.includes('mediafire.com')) {
            return 'MediaFire';
        } else if (url.includes('mega.nz') || url.includes('mega.io')) {
            return 'Mega';
        }
        return 'ไม่รองรับ';
    };

    return (
        <div className="p-6">
            <h3 className="text-xl font-semibold mb-4">รายการดาวน์โหลดเอกสาร</h3>
            <div className="space-y-4">
                {downloads.map((download) => {
                    const provider = getProviderName(download.url);
                    const downloadInfo = downloadState[`download_${download.id}_${Date.now()}`] ||
                        Object.values(downloadState).find(state =>
                            state.status === 'downloading' || state.status === 'pending');

                    return (
                        <div
                            key={download.id}
                            className="flex items-center justify-between p-4 bg-base-200 rounded-lg border border-base-300 hover:border-primary transition-colors"
                        >
                            <div>
                                <h4 className="font-medium">{download.name}</h4>
                                <p className="text-sm text-base-content/70 mt-1">
                                    อัปเดตเมื่อ: {formatDate(download.updatedAt)} เวลา{' '}
                                    {formatTime(download.updatedAt)}
                                </p>
                                <p className="text-sm text-base-content/70">ผู้ให้บริการ: {provider}</p>
                                {!download.isActive && (
                                    <div className="badge badge-error badge-sm mt-2">ไม่พร้อมใช้งาน</div>
                                )}

                                {downloadInfo && downloadInfo.status === 'downloading' && (
                                    <div className="mt-2">
                                        <progress
                                            className="progress progress-primary w-56"
                                            value={downloadInfo.progress}
                                            max="100"
                                        ></progress>
                                        <span className="text-xs ml-2">{downloadInfo.progress}%</span>
                                    </div>
                                )}

                                {downloadInfo && downloadInfo.status === 'error' && (
                                    <div className="badge badge-error mt-2">
                                        ดาวน์โหลดล้มเหลว
                                    </div>
                                )}
                            </div>

                            <button
                                className={`btn btn-primary gap-2 ${!download.isActive && 'btn-disabled'} ${
                                    downloadInfo && downloadInfo.status === 'downloading' ? 'btn-disabled' : ''
                                }`}
                                onClick={() => handleDownload(download)}
                                disabled={!download.isActive || (downloadInfo && downloadInfo.status === 'downloading')}
                            >
                                <Download size={16} />
                                {downloadInfo && downloadInfo.status === 'downloading'
                                    ? 'กำลังดาวน์โหลด...'
                                    : downloadInfo && downloadInfo.status === 'complete'
                                        ? 'ดาวน์โหลดสำเร็จ'
                                        : 'ดาวน์โหลด'}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ArticleDownloads;