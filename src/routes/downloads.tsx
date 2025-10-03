// downloads.tsx
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Download, FolderOpen, FileText, X, AlertCircle } from "lucide-react";
import { DownloadItem } from "./types/types.ts";

export default function DownloadManager() {
    const [downloads, setDownloads] = useState<DownloadItem[]>([]);
    const [downloadUrl, setDownloadUrl] = useState("");
    const [downloadDirectory, setDownloadDirectory] = useState("");

    useEffect(() => {
        loadDownloadDirectory();
        setupListeners();
        loadActiveDownloads();

        return () => {
            // Cleanup listeners (handled in setupListeners)
        };
    }, []);
    
    // Add additional effect to update UI faster when cancellation is requested
    useEffect(() => {
        const handleCancelRequest = (downloadId: string) => {
            setDownloads((currentDownloads) =>
                currentDownloads.map((download) =>
                    download.id === downloadId
                        ? {
                            ...download,
                            status: "cancelled",
                            error: "Cancellation requested...",
                            progress: 0,
                        }
                        : download
                )
            );
        };
        
        // Any time a cancel button is clicked, update the UI immediately
        // while we wait for the backend cancellation to process
        window.addEventListener("download-cancel-requested", (e: any) => {
            if (e.detail && e.detail.downloadId) {
                handleCancelRequest(e.detail.downloadId);
            }
        });
        
        return () => {
            window.removeEventListener("download-cancel-requested", (e: any) => {
                if (e.detail && e.detail.downloadId) {
                    handleCancelRequest(e.detail.downloadId);
                }
            });
        };
    }, []);

    const setupListeners = async () => {
        const unlistenProgress = await listen("download-progress", (event) => {
            const { id, progress } = event.payload as { id: string; progress: number };
            setDownloads((currentDownloads) =>
                currentDownloads.map((download) =>
                    download.id === id
                        ? { ...download, progress, status: "downloading" }
                        : download
                )
            );
        });

        const unlistenComplete = await listen("download-complete", (event) => {
            const { id, path, filename } = event.payload as {
                id: string;
                path: string;
                filename: string;
            };
            setDownloads((currentDownloads) =>
                currentDownloads.map((download) =>
                    download.id === id
                        ? { ...download, status: "completed", progress: 100, path, filename }
                        : download
                )
            );
        });

        const unlistenError = await listen("download-error", (event) => {
            const { id, error } = event.payload as {
                id: string;
                error: string;
            };
            setDownloads((currentDownloads) =>
                currentDownloads.map((download) =>
                    download.id === id
                        ? { ...download, status: "failed", error }
                        : download
                )
            );
        });

        const unlistenCancel = await listen("cancel-download", (event) => {
            const { download_id } = event.payload as { download_id: string };
            setDownloads((currentDownloads) =>
                currentDownloads.map((download) =>
                    download.id === download_id
                        ? {
                            ...download,
                            status: "cancelled",
                            error: "Download cancelled by user",
                            progress: 0,
                        }
                        : download
                )
            );
        });

        return () => {
            unlistenProgress();
            unlistenComplete();
            unlistenError();
            unlistenCancel();
        };
    };

    const loadDownloadDirectory = async () => {
        try {
            const dir = (await invoke("get_download_dir")) as string;
            setDownloadDirectory(dir);
        } catch (err) {
            console.error("Failed to load download directory:", err);
            setDownloadDirectory("Not set");
            alert("Download directory not set. Please configure it in settings.");
        }
    };

    const loadActiveDownloads = async () => {
        try {
            const activeDownloads = (await invoke("get_active_downloads")) as DownloadItem[];
            if (activeDownloads && activeDownloads.length > 0) {
                setDownloads(activeDownloads);
            }
        } catch (err) {
            console.error("Failed to load active downloads:", err);
        }
    };

    const startDownload = async () => {
        if (!downloadUrl.trim()) {
            alert("Please enter a URL to download");
            return;
        }

        const downloadId = `dl_${Date.now()}`;
        const url = new URL(downloadUrl);
        const pathSegments = url.pathname.split("/").filter((segment) => segment);
        let filename = pathSegments[pathSegments.length - 1] || "download.bin";

        const newDownload: DownloadItem = {
            id: downloadId,
            filename,
            url: downloadUrl,
            progress: 0,
            status: "pending",
            provider: "webview2",
        };

        setDownloads((prev) => [...prev, newDownload]);

        try {
            await invoke("start_webview2_download", {
                url: downloadUrl,
                filename,
                downloadId,
            });
        } catch (err) {
            console.error("Failed to start download:", err);
            setDownloads((prev) =>
                prev.map((download) =>
                    download.id === downloadId
                        ? { ...download, status: "failed", error: String(err) }
                        : download
                )
            );
        }

        setDownloadUrl("");
    };

    const cancelDownload = async (downloadId: string) => {
        try {
            await invoke("cancel_active_download", { downloadId });
        } catch (err) {
            console.error("Failed to cancel download:", err);
            alert(`Failed to cancel download: ${err}`);
        }
    };

    const openFile = async (path: string) => {
        try {
            await invoke("open_file", { path });
        } catch (err) {
            console.error("Failed to open file:", err);
            alert(`Failed to open file: ${err}`);
        }
    };

    const openDownloadDirectory = async () => {
        try {
            if (downloadDirectory === "Not set") {
                alert("Download directory not set. Please configure it in settings.");
                return;
            }
            await invoke("open_directory", { path: downloadDirectory });
        } catch (err) {
            console.error("Failed to open download directory:", err);
            alert(`Failed to open download directory: ${err}`);
        }
    };

    return (
        <div className="flex flex-col h-full w-full p-6 bg-gray-900 text-white">
            <div className="mb-8">
                <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    Download Manager
                </h2>
                <p className="text-gray-400">Manage your downloads and track progress</p>
            </div>

            <Card className="mb-6 bg-gray-800 border-gray-700">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                        <FolderOpen className="w-5 h-5" />
                        Download Settings
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="text-sm font-medium text-gray-300">Download Directory:</label>
                            <p className="text-sm text-gray-400 mt-1">{downloadDirectory}</p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={openDownloadDirectory}
                            className="border-gray-600 text-gray-300 hover:bg-gray-700"
                        >
                            <FolderOpen className="w-4 h-4 mr-2" />
                            Open Directory
                        </Button>
                    </div>

                    <div className="flex gap-2">
                        <Input
                            type="text"
                            value={downloadUrl}
                            onChange={(e) => setDownloadUrl(e.target.value)}
                            className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                            placeholder="Enter URL to download"
                        />
                        <Button onClick={startDownload} className="bg-blue-600 hover:bg-blue-700">
                            <Download className="w-4 h-4 mr-2" />
                            Download
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {downloads.length > 0 && (
                <div className="overflow-y-auto">
                    <h3 className="text-xl font-semibold mb-4 text-white">Active Downloads</h3>
                    <div className="space-y-4">
                        {downloads.map((download) => (
                            <Card key={download.id} className="bg-gray-800 border-gray-700">
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-lg font-medium text-white flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            {download.filename}
                                        </CardTitle>
                                        {download.provider && (
                                            <Badge variant="outline" className="border-gray-600 text-gray-300">
                                                {download.provider}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400 truncate">{download.url}</p>
                                </CardHeader>
                                <CardContent>

                                    {download.status === "downloading" && (
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-blue-400 font-medium">Downloading...</span>
                                                <span className="text-sm text-gray-300">{download.progress.toFixed(2)}%</span>
                                            </div>
                                            <Progress value={download.progress} className="w-full" />
                                            <div className="flex justify-end">
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => {
                                                        window.dispatchEvent(new CustomEvent("download-cancel-requested", {
                                                            detail: { downloadId: download.id }
                                                        }));
                                                        cancelDownload(download.id);
                                                    }}
                                                >
                                                    <X className="w-4 h-4 mr-2" />
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {download.status === "pending" && (
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-yellow-400 font-medium">Waiting to start...</span>
                                            </div>
                                            <Progress value={0} className="w-full" />
                                            <div className="flex justify-end">
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => cancelDownload(download.id)}
                                                >
                                                    <X className="w-4 h-4 mr-2" />
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {download.status === "completed" && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-green-400 font-medium">Download complete</span>
                                                {download.path && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openFile(download.path as string)}
                                                        className="border-green-600 text-green-400 hover:bg-green-600/10"
                                                    >
                                                        <FileText className="w-4 h-4 mr-2" />
                                                        Open File
                                                    </Button>
                                                )}
                                            </div>
                                            {download.path && (
                                                <p className="text-xs text-gray-400 break-all">{download.path}</p>
                                            )}
                                        </div>
                                    )}

                                    {(download.status === "failed" || download.status === "cancelled") && (
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 text-red-400" />
                                            <div>
                                                <p className={`font-medium ${download.status === "failed" ? "text-red-400" : "text-yellow-400"}`}>
                                                    {download.status === "failed" ? "Download failed" : "Download cancelled"}
                                                </p>
                                                <p className="text-sm text-gray-400">
                                                    {download.error?.replace("Download failed: ", "").replace("Download cancelled: ", "") || "Unknown error"}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}