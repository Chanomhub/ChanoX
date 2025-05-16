import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { message } from '@tauri-apps/plugin-dialog';

interface ArticleDownload {
    id: number;
    articleId: number;
    name: string;
    url: string;
    isActive: boolean;
    status: string;
    createdAt: string;
    updatedAt: string;
}

interface ArticleDownloadsProps {
    downloads: ArticleDownload[];
}

const ArticleDownloads: React.FC<ArticleDownloadsProps> = ({ downloads }) => {
    const [downloadStatus, setDownloadStatus] = useState<{ [key: string]: string }>({});
    const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: number }>({});
    const [cancellingDownloads, setCancellingDownloads] = useState<{ [key: string]: boolean }>({});

    useEffect(() => {
        const setupListeners = async () => {
            const listeners = [
                await listen('download-progress', (event) => {
                    const { id, progress } = event.payload as { id: string; progress: number };
                    setDownloadProgress((prev) => ({ ...prev, [id]: progress }));
                    setDownloadStatus((prev) => ({ ...prev, [id]: `Downloading (${progress.toFixed(2)}%)` }));
                }),
                await listen('download-complete', (event) => {
                    const { id, filename } = event.payload as { id: string; filename: string };
                    setDownloadStatus((prev) => ({ ...prev, [id]: `Completed: ${filename}` }));
                    setDownloadProgress((prev) => ({ ...prev, [id]: 100 }));
                    setCancellingDownloads((prev) => ({ ...prev, [id]: false }));
                }),
                await listen('download-error', (event) => {
                    const { id, error } = event.payload as { id: string; error: string };
                    setDownloadStatus((prev) => ({ ...prev, [id]: `Error: ${error}` }));
                    setCancellingDownloads((prev) => ({ ...prev, [id]: false }));
                }),
                await listen('cancel-download', (event) => {
                    const { download_id } = event.payload as { download_id: string };
                    setDownloadStatus((prev) => ({ ...prev, [download_id]: 'Cancelled' }));
                    setDownloadProgress((prev) => ({ ...prev, [download_id]: 0 }));
                    setCancellingDownloads((prev) => ({ ...prev, [download_id]: false }));
                }),
            ];
            return () => listeners.forEach((unlisten) => unlisten());
        };

        const cleanup = setupListeners();
        return () => {
            cleanup.then((unlisten) => unlisten());
        };
    }, []);

    const handleDownload = async (download: ArticleDownload) => {
        if (!download.isActive || download.status !== 'APPROVED') {
            await message('Download is not available.', { title: 'Error', kind: 'error' });
            return;
        }

        const downloadId = `article_download_${download.id}`;
        try {
            setDownloadStatus((prev) => ({ ...prev, [downloadId]: 'Starting...' }));
            setDownloadProgress((prev) => ({ ...prev, [downloadId]: 0 }));

            await invoke('start_webview2_download', {
                url: download.url,
                filename: download.name,
                downloadId,
            });
        } catch (error) {
            setDownloadStatus((prev) => ({ ...prev, [downloadId]: `Error: ${String(error)}` }));
            await message(`Failed to start download: ${error}`, { title: 'Error', kind: 'error' });
        }
    };

    const handleCancelDownload = async (download: ArticleDownload) => {
        const downloadId = `article_download_${download.id}`;
        try {
            setCancellingDownloads((prev) => ({ ...prev, [downloadId]: true }));
            setDownloadStatus((prev) => ({ ...prev, [downloadId]: 'Cancelling...' }));

            await invoke('cancel_active_download', { download_id: downloadId });
        } catch (error) {
            setDownloadStatus((prev) => ({ ...prev, [downloadId]: `Error cancelling: ${String(error)}` }));
            setCancellingDownloads((prev) => ({ ...prev, [downloadId]: false }));
            await message(`Failed to cancel download: ${error}`, { title: 'Error', kind: 'error' });
        }
    };

    const isDownloading = (downloadId: string) => {
        const status = downloadStatus[downloadId];
        return status?.includes('Downloading') || status === 'Starting...';
    };

    return (
        <div className="p-6">
            <h3 className="text-xl font-semibold mb-4">Download Files</h3>
            <div className="space-y-4">
                {downloads.length === 0 ? (
                    <p className="text-base-content/70">No downloads available.</p>
                ) : (
                    downloads.map((download) => {
                        const downloadId = `article_download_${download.id}`;
                        const downloading = isDownloading(downloadId);
                        const cancelling = cancellingDownloads[downloadId];
                        const isDownloadDisabled = !download.isActive || download.status !== 'APPROVED';

                        return (
                            <div key={download.id} className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
                                <div className="flex-grow mr-4">
                                    <p className="font-medium">{download.name}</p>
                                    <p className="text-sm text-base-content/70">
                                        Status: {download.status} | {downloadStatus[downloadId] || 'Ready to download'}
                                    </p>
                                    {downloadProgress[downloadId] > 0 && (
                                        <progress
                                            className="progress progress-primary w-full mt-2"
                                            value={downloadProgress[downloadId]}
                                            max="100"
                                        />
                                    )}
                                </div>
                                <div className="flex space-x-2">
                                    {downloading && !cancelling && (
                                        <button
                                            className="btn btn-error btn-sm"
                                            onClick={() => handleCancelDownload(download)}
                                            disabled={cancelling}
                                        >
                                            {cancelling ? 'Cancelling...' : 'Cancel'}
                                        </button>
                                    )}
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => handleDownload(download)}
                                        disabled={downloading || cancelling || isDownloadDisabled}
                                    >
                                        Download
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ArticleDownloads;