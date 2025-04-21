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
            });

            const unlistenError = await listen('download-error', (event) => {
                console.log('Received download-error event:', event.payload);
                const { id, error } = event.payload as { id: string; error: string };
                setDownloadStatus((prev) => ({ ...prev, [id]: `Error: ${error}` }));
            });

            // Listener สำหรับ debug event การเริ่มดาวน์โหลด
            const unlistenStart = await listen('start-webview2-download', (event) => {
                console.log('Received start-webview2-download event:', event.payload);
            });

            return [unlistenProgress, unlistenComplete, unlistenError, unlistenStart];
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

    return (
        <div className="p-6">
            <h3 className="text-xl font-semibold mb-4">Download Files</h3>
            <div className="space-y-4">
                {downloads.map((download) => (
                    <div key={download.id} className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
                        <div>
                            <p className="font-medium">{download.name}</p>
                            <p className="text-sm text-base-content/70">
                                {downloadStatus[`article_download_${download.id}`] || 'Ready to download'}
                            </p>
                            {downloadProgress[`article_download_${download.id}`] > 0 && (
                                <progress
                                    className="progress progress-primary w-full"
                                    value={downloadProgress[`article_download_${download.id}`]}
                                    max="100"
                                />
                            )}
                        </div>
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleDownload(download)}
                            disabled={downloadStatus[`article_download_${download.id}`]?.includes('Downloading')}
                        >
                            Download
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ArticleDownloads;