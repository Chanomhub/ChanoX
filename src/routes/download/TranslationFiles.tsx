import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { message } from '@tauri-apps/plugin-dialog';

interface TranslationFile {
    id: number;
    articleId: number;
    translatorId: number;
    name: string;
    description: string;
    language: string;
    creditTo: string;
    fileUrl: string;
    version: string;
    articleVersion: number;
    status: string;
    createdAt: string;
    updatedAt: string;
    translator: {
        id: number;
        name: string;
        image: string;
    };
    images: string[];
}

interface TranslationFilesProps {
    translationFiles: TranslationFile[];
}

const TranslationFiles: React.FC<TranslationFilesProps> = ({ translationFiles }) => {
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

    const handleDownload = async (translation: TranslationFile) => {
        if (translation.status !== 'APPROVED') {
            await message('Translation file is not available.', { title: 'Error', kind: 'error' });
            return;
        }

        const downloadId = `translation_download_${translation.id}`;
        try {
            setDownloadStatus((prev) => ({ ...prev, [downloadId]: 'Starting...' }));
            setDownloadProgress((prev) => ({ ...prev, [downloadId]: 0 }));

            await invoke('start_webview2_download', {
                url: translation.fileUrl,
                filename: translation.name,
                downloadId,
            });
        } catch (error) {
            setDownloadStatus((prev) => ({ ...prev, [downloadId]: `Error: ${String(error)}` }));
            await message(`Failed to start download: ${error}`, { title: 'Error', kind: 'error' });
        }
    };

    const handleCancelDownload = async (translation: TranslationFile) => {
        const downloadId = `translation_download_${translation.id}`;
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
            <h3 className="text-xl font-semibold mb-4">Translation Files</h3>
            <div className="space-y-4">
                {!Array.isArray(translationFiles) || translationFiles.length === 0 ? (
                    <p className="text-base-content/70">No translation files available.</p>
                ) : (
                    translationFiles.map((translation) => {
                        const downloadId = `translation_download_${translation.id}`;
                        const downloading = isDownloading(downloadId);
                        const cancelling = cancellingDownloads[downloadId];
                        const isDownloadDisabled = translation.status !== 'APPROVED';

                        return (
                            <div key={translation.id} className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
                                <div className="flex-grow mr-4">
                                    <p className="font-medium">{translation.name}</p>
                                    <p className="text-sm text-base-content/70">
                                        Translator: {translation.translator.name} | Language: {translation.language} |
                                        Status: {translation.status} | {downloadStatus[downloadId] || 'Ready to download'}
                                    </p>
                                    {translation.description && (
                                        <p className="text-sm text-base-content/70 mt-1">{translation.description}</p>
                                    )}
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
                                            onClick={() => handleCancelDownload(translation)}
                                            disabled={cancelling}
                                        >
                                            {cancelling ? 'Cancelling...' : 'Cancel'}
                                        </button>
                                    )}
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => handleDownload(translation)}
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

export default TranslationFiles;