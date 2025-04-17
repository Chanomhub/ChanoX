import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useState, useEffect } from "react";
import { FiPlay } from 'react-icons/fi'; // Added FiPlay

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

interface PluginManifest {
    id: string;
    name: string;
    supported_hosts: string[];
    supported_actions: string[];
}

export default function DownloadManager() {
    const [downloads, setDownloads] = useState<DownloadItem[]>([]);
    const [downloadUrl, setDownloadUrl] = useState("");
    const [downloadDirectory, setDownloadDirectory] = useState("");
    const [availablePlugins, setAvailablePlugins] = useState<PluginManifest[]>([]);
    const [selectedPlugin, setSelectedPlugin] = useState<string>("");
    const [selectedAction, setSelectedAction] = useState<string>("download");
    const [actionInput, setActionInput] = useState<string>("");

    useEffect(() => {
        loadDownloadDirectory();
        loadAvailablePlugins();
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

            loadActiveDownloads();
            return [unlistenProgress, unlistenComplete, unlistenError, unlistenCancel];
        };

        const unlisten = setupListeners();
        return () => {
            unlisten.then((unlistenFns) => {
                unlistenFns.forEach((fn) => fn());
            });
        };
    }, []);

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

    const loadAvailablePlugins = async () => {
        try {
            const detailsMap: Record<string, PluginManifest> = await invoke("get_all_plugins");
            const plugins = Object.values(detailsMap).map(plugin => ({
                id: plugin.id,
                name: plugin.name,
                supported_hosts: plugin.supported_hosts,
                supported_actions: plugin.supported_actions,
            }));
            setAvailablePlugins(plugins);
        } catch (err) {
            console.error("Failed to load available plugins:", err);
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
        const pathSegments = url.pathname.split("/").filter((segment) => segment && segment !== "file");
        let filename = pathSegments[pathSegments.length - 1] || "download.bin";

        if (url.hostname.includes("mediafire.com") && filename === "file") {
            filename = pathSegments[pathSegments.length - 2] || "download.bin";
        }

        const host = url.hostname;
        const provider = availablePlugins.find((plugin) =>
            plugin.supported_hosts.some((h) =>
                h.startsWith('*.') ? host.endsWith(h.slice(2)) : h === host
            )
        );

        if (!provider) {
            alert("No plugin supports this host");
            return;
        }

        const newDownload: DownloadItem = {
            id: downloadId,
            filename,
            url: downloadUrl,
            progress: 0,
            status: "pending",
            provider: provider.id,
        };

        setDownloads((prev) => [...prev, newDownload]);

        try {
            await invoke("download_from_url", {
                url: downloadUrl,
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

    const executePluginAction = async () => {
        if (!selectedPlugin || !selectedAction) {
            alert("Please select a plugin and action");
            return;
        }

        let parsedInput: any;
        try {
            parsedInput = actionInput ? JSON.parse(actionInput) : {};
        } catch (e) {
            alert("Invalid JSON input");
            return;
        }

        try {
            const result = await invoke("execute_plugin_action", {
                pluginId: selectedPlugin,
                action: selectedAction,
                input: parsedInput,
            });
            alert(`Action result: ${JSON.stringify(result, null, 2)}`);
        } catch (err) {
            console.error("Failed to execute action:", err);
            alert(`Failed to execute action: ${err}`);
        }
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

                <div className="flex flex-col space-y-2">
                    <div className="flex items-center">
                        <label className="block text-sm font-medium mr-2">Plugin Action:</label>
                        <select
                            value={selectedPlugin}
                            onChange={(e) => {
                                setSelectedPlugin(e.target.value);
                                setSelectedAction("");
                            }}
                            className="select select-bordered mr-2"
                        >
                            <option value="">Select Plugin</option>
                            {availablePlugins.map((plugin) => (
                                <option key={plugin.id} value={plugin.id}>
                                    {plugin.name}
                                </option>
                            ))}
                        </select>
                        <select
                            value={selectedAction}
                            onChange={(e) => setSelectedAction(e.target.value)}
                            className="select select-bordered mr-2"
                            disabled={!selectedPlugin}
                        >
                            <option value="">Select Action</option>
                            {selectedPlugin &&
                                availablePlugins
                                    .find((p) => p.id === selectedPlugin)
                                    ?.supported_actions.map((action) => (
                                    <option key={action} value={action}>
                                        {action}
                                    </option>
                                ))}
                        </select>
                        <input
                            type="text"
                            value={actionInput}
                            onChange={(e) => setActionInput(e.target.value)}
                            className="input input-bordered flex-1 mr-2"
                            placeholder='{"key": "value"}'
                        />
                        <button
                            className="btn btn-primary"
                            onClick={executePluginAction}
                            disabled={!selectedPlugin || !selectedAction}
                        >
                            <FiPlay className="mr-1" /> Execute
                        </button>
                    </div>
                    {availablePlugins.length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                            Supported providers: {availablePlugins.map(p => p.name).join(", ")}
                        </div>
                    )}
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
                                                onClick={() => cancelDownload(download.id)}
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
                                    <div className="text-error">
                                        {download.status === "failed" ? "Download failed" : "Download cancelled"}:{" "}
                                        {download.error?.replace("Download failed: ", "") || "Unknown error"}
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