import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {ArticleDownload} from "../components/articles/types/types.ts";

export const ArticleDownloads: React.FC<{ downloads: ArticleDownload[] }> = ({ downloads }) => {
    const [downloadStatus, setDownloadStatus] = useState<{ [key: string]: string }>({});
    const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: number }>({});

    useEffect(() => {
        // Set up event listeners for download progress/completion
        const setupListeners = async () => {
            const listeners = [
                await listen('download-progress', (event) => {
                    const { id, progress } = event.payload as { id: string; progress: number };
                    setDownloadProgress((prev) => ({ ...prev, [id]: progress }));
                    setDownloadStatus((prev) => ({ ...prev, [id]: `กำลังดาวน์โหลด (${progress.toFixed(2)}%)` }));
                }),
                await listen('download-complete', (event) => {
                    const { id } = event.payload as { id: string; filename: string };
                    setDownloadStatus((prev) => ({ ...prev, [id]: `เสร็จสมบูรณ์` }));
                    setDownloadProgress((prev) => ({ ...prev, [id]: 100 }));
                }),
                await listen('download-error', (event) => {
                    const { id, error } = event.payload as { id: string; error: string };
                    setDownloadStatus((prev) => ({ ...prev, [id]: `ข้อผิดพลาด: ${error}` }));
                }),
            ];
            return () => listeners.forEach((unlisten) => unlisten());
        };

        setupListeners();
    }, []);

    const handleDownload = async (download: ArticleDownload) => {
        if (!download.isActive || download.status !== 'APPROVED') return;

        const downloadId = `article_download_${download.id}`;
        try {
            setDownloadStatus((prev) => ({ ...prev, [downloadId]: 'กำลังเริ่มต้น...' }));
            setDownloadProgress((prev) => ({ ...prev, [downloadId]: 0 }));

            await invoke('start_webview2_download', {
                url: download.url,
                filename: download.name,
                downloadId,
            });
        } catch (error) {
            setDownloadStatus((prev) => ({ ...prev, [downloadId]: `ข้อผิดพลาด: ${String(error)}` }));
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
                        const isDownloading = downloadStatus[downloadId]?.includes('กำลังดาวน์โหลด');

                        return (
                            <div key={download.id} className="p-4 bg-base-200 rounded-lg flex justify-between">
                                <div>
                                    <p className="font-medium">{download.name}</p>
                                    <p className="text-sm">
                                        สถานะ: {downloadStatus[downloadId] || 'พร้อมดาวน์โหลด'}
                                    </p>
                                    {downloadProgress[downloadId] > 0 && (
                                        <progress
                                            className="progress progress-primary w-full mt-2"
                                            value={downloadProgress[downloadId]}
                                            max="100"
                                        />
                                    )}
                                </div>
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => handleDownload(download)}
                                    disabled={isDownloading}
                                >
                                    {isDownloading ? 'กำลังดาวน์โหลด...' : 'ดาวน์โหลด'}
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};