// downloads.tsx
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useState, useEffect } from "react";


interface DownloadItem {
    id: string;
    filename: string;
    url: string;
    progress: number;
    status: "pending" | "downloading" | "completed" | "failed" | "cancelled";
    path?: string;
    error?: string;
    provider?: string;
}

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
            window.removeEventListener("download-cancel-requested", (e: any) => {});
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
        <div className="flex flex-col h-full w-full p-6">
            <h2 className="text-2xl font-bold mb-6">Download Manager</h2>

            <div className="mb-6">
                <div className="flex items-center mb-2">
                    <label className="block text-sm font-medium mr-2">Download Directory:</label>
                    <span className="text-sm">{downloadDirectory}</span>
                    <button
                        className="btn btn-sm btn-outline ml-2"
                        onClick={openDownloadDirectory}
                    >
                        Open Directory
                    </button>
                </div>

                <div className="flex mb-4">
                    <input
                        type="text"
                        value={downloadUrl}
                        onChange={(e) => setDownloadUrl(e.target.value)}
                        className="input input-bordered flex-1 mr-2"
                        placeholder="Enter URL to download"
                    />
                    <button className="btn btn-primary" onClick={startDownload}>
                        Download
                    </button>
                </div>
            </div>

            {downloads.length > 0 && (
                <div className="overflow-y-auto">
                    <h3 className="text-xl font-semibold mb-2">Downloads</h3>
                    <div className="space-y-4">
                        {downloads.map((download) => (
                            <div key={download.id} className="border rounded-lg p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium">{download.filename}</span>
                                    {download.provider && (
                                        <span className="badge badge-outline">{download.provider}</span>
                                    )}
                                </div>

                                <div className="text-xs mb-2 text-gray-500 truncate">{download.url}</div>

                                {download.status === "downloading" && (
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <span className="text-sm">{download.status}</span>
                                            <span className="text-sm">{download.progress.toFixed(2)}%</span>
                                        </div>
                                        <progress
                                            className="progress progress-primary w-full"
                                            value={download.progress}
                                            max="100"
                                        ></progress>
                                        <div className="flex justify-end mt-2">
                                            <button
                                                className="btn btn-sm btn-error"
                                                onClick={() => {
                                                    // Dispatch a custom event to update UI immediately
                                                    window.dispatchEvent(new CustomEvent("download-cancel-requested", {
                                                        detail: { downloadId: download.id }
                                                    }));
                                                    cancelDownload(download.id);
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {download.status === "pending" && (
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <span className="text-sm">Waiting to start...</span>
                                        </div>
                                        <progress
                                            className="progress progress-primary w-full"
                                            value={0}
                                            max="100"
                                        ></progress>
                                        <div className="flex justify-end mt-2">
                                            <button
                                                className="btn btn-sm btn-error"
                                                onClick={() => cancelDownload(download.id)}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {download.status === "completed" && (
                                    <div>
                                        <div className="text-success flex justify-between items-center">
                                            <span>Download complete</span>
                                            {download.path && (
                                                <button
                                                    className="btn btn-sm btn-outline btn-success"
                                                    onClick={() => openFile(download.path as string)}
                                                >
                                                    Open File
                                                </button>
                                            )}
                                        </div>
                                        <div className="text-xs mt-1 text-gray-500">{download.path}</div>
                                    </div>
                                )}

                                {(download.status === "failed" || download.status === "cancelled") && (
                                    <div className={download.status === "failed" ? "text-error" : "text-warning"}>
                                        {download.status === "failed" ? "Download failed" : "Download cancelled"}:{" "}
                                        {download.error?.replace("Download failed: ", "").replace("Download cancelled: ", "") || "Unknown error"}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}