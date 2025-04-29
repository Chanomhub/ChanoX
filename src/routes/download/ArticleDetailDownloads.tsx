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
            console.log('Setting up download listeners');

            const unlistenProgress = await listen('download-progress', (event) => {
                console.log('Received download-progress event:', event.payload);
                const { id, progress } = event.payload as { id: string; progress: number };
                setDownloadProgress((prev) => ({ ...prev, [id]: progress }));
                setDownloadStatus((prev) => ({ ...prev, [id]: `Downloading (${progress.toFixed(2)}%)` }));
            });

            const unlistenComplete = await listen('download-complete', (event) => {
                console.log('Received download-complete event:', event.payload);
                const { id, filename } = event.payload as { id: string; filename: string };
                setDownloadStatus((prev) => ({ ...prev, [id]: `Download completed: ${filename}` }));
                setDownloadProgress((prev) => ({ ...prev, [id]: 100 }));
                setCancellingDownloads((prev) => ({ ...prev, [id]: false }));
            });

            const unlistenError = await listen('download-error', (event) => {
                console.log('Received download-error event:', event.payload);
                const { id, error } = event.payload as { id: string; error: string };
                setDownloadStatus((prev) => ({ ...prev, [id]: `Error: ${error}` }));
                setCancellingDownloads((prev) => ({ ...prev, [id]: false }));
            });

            // Listener สำหรับ debug event การเริ่มดาวน์โหลด
            const unlistenStart = await listen('start-webview2-download', (event) => {
                console.log('Received start-webview2-download event:', event.payload);
            });

            // Listener for cancel-download events
            const unlistenCancel = await listen('cancel-download', (event) => {
                console.log('Received cancel-download event:', event.payload);
                const { download_id } = event.payload as { download_id: string };
                setDownloadStatus((prev) => ({ ...prev, [download_id]: 'Download cancelled' }));
                setDownloadProgress((prev) => ({ ...prev, [download_id]: 0 }));
                setCancellingDownloads((prev) => ({ ...prev, [download_id]: false }));
            });

            return [unlistenProgress, unlistenComplete, unlistenError, unlistenStart, unlistenCancel];
        };

        const unlisten = setupListeners();
        return () => {
            unlisten.then((unlistenFns) => unlistenFns.forEach((fn) => fn()));
        };
    }, []);

    const handleDownload = async (download: ArticleDownload) => {
        try {
            const downloadId = `article_download_${download.id}`;
            console.log(`Starting download: id=${downloadId}, url=${download.url}, filename=${download.name}`);
            setDownloadStatus((prev) => ({ ...prev, [downloadId]: 'Starting download...' }));
            setDownloadProgress((prev) => ({ ...prev, [downloadId]: 0 }));

            await invoke('start_webview2_download', {
                url: download.url,
                filename: download.name,
                downloadId,
            });
            console.log(`Invoked start_webview2_download for id=${downloadId}`);
        } catch (error) {
            const downloadId = `article_download_${download.id}`;
            console.error(`Failed to start download for id=${downloadId}:`, error);
            setDownloadStatus((prev) => ({ ...prev, [downloadId]: `Error: ${error}` }));
            await message(`Failed to start download: ${error}`, { title: 'Error', kind: 'error' });
        }
    };

    const handleCancelDownload = async (download: ArticleDownload) => {
        const downloadId = `article_download_${download.id}`;
        console.log(`Cancelling download: id=${downloadId}`);
        
        try {
            setCancellingDownloads((prev) => ({ ...prev, [downloadId]: true }));
            setDownloadStatus((prev) => ({ ...prev, [downloadId]: 'Cancelling download...' }));
            
            await invoke('cancel_active_download', { download_id: downloadId });
            console.log(`Invoked cancel_active_download for id=${downloadId}`);
        } catch (error) {
            console.error(`Failed to cancel download for id=${downloadId}:`, error);
            setDownloadStatus((prev) => ({ ...prev, [downloadId]: `Error cancelling: ${error}` }));
            setCancellingDownloads((prev) => ({ ...prev, [downloadId]: false }));
            await message(`Failed to cancel download: ${error}`, { title: 'Error', kind: 'error' });
        }
    };

    const isDownloading = (downloadId: string) => {
        const status = downloadStatus[downloadId];
        return status?.includes('Downloading') || status === 'Starting download...';
    };

    return (
        <div className="p-6">
            <h3 className="text-xl font-semibold mb-4">Download Files</h3>
            <div className="space-y-4">
                {downloads.map((download) => {
                    const downloadId = `article_download_${download.id}`;
                    const downloading = isDownloading(downloadId);
                    const cancelling = cancellingDownloads[downloadId];
                    
                    return (
                        <div key={download.id} className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
                            <div className="flex-grow mr-4">
                                <p className="font-medium">{download.name}</p>
                                <p className="text-sm text-base-content/70">
                                    {downloadStatus[downloadId] || 'Ready to download'}
                                </p>
                                {downloadProgress[downloadId] > 0 && (
                                    <progress
                                        className="progress progress-primary w-full"
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
                                    disabled={downloading || cancelling}
                                >
                                    Download
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ArticleDownloads;