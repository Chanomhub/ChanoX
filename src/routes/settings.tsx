import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { check } from '@tauri-apps/plugin-updater';
import { ask, message } from '@tauri-apps/plugin-dialog';
import { IconRefresh } from "@tabler/icons-react";


const LOCAL_STORAGE_KEYS = {
    TOKEN: 'chanomhub_token',
    DOWNLOAD_DIR: 'chanomhub_download_dir'
};

export default function Settings() {
    // State
    const [token, setToken] = useState("");
    const [downloadDir, setDownloadDir] = useState("");
    const [statusMessage, setStatusMessage] = useState("");
    const [isError, setIsError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isTauriAvailable, setIsTauriAvailable] = useState(true);
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

    // Effects
    useEffect(() => {
        const initializeSettings = async () => {
            try {
                // Test if Tauri is available
                await invoke("echo_test", { message: "Test" });
                setIsTauriAvailable(true);

                // Load settings from Tauri backend
                await loadSettings();
                await loadDownloadDir();
            } catch (error) {
                console.log("Tauri not available, using localStorage only", error);
                setIsTauriAvailable(false);

                // Fall back to localStorage
                loadSettingsFromLocalStorage();
            }
        };

        initializeSettings();
    }, []);

    // Helper functions
    const showStatus = (message: string, error = false) => {
        setStatusMessage(message);
        setIsError(error);

        setTimeout(() => {
            setStatusMessage("");
            setIsError(false);
        }, 5000);
    };

    // Storage management functions
    const loadSettingsFromLocalStorage = () => {
        try {
            // Load token
            const storedToken = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
            if (storedToken) setToken(storedToken);

            // Load download directory
            const storedDownloadDir = localStorage.getItem(LOCAL_STORAGE_KEYS.DOWNLOAD_DIR);
            if (storedDownloadDir) setDownloadDir(storedDownloadDir);

            console.log("Settings loaded from localStorage successfully");
        } catch (err) {
            console.error("Failed to load settings from localStorage:", err);
            showStatus(`Failed to load settings from localStorage: ${err}`, true);
        }
    };

    const loadSettings = async () => {
        setIsLoading(true);
        try {
            // Load token
            const retrievedToken = await invoke("get_token");
            if (typeof retrievedToken === "string") {
                setToken(retrievedToken);
                localStorage.setItem(LOCAL_STORAGE_KEYS.TOKEN, retrievedToken);
            }
        } catch (err) {
            console.error("Failed to load settings:", err);
            showStatus(`Failed to load settings: ${err}`, true);
        } finally {
            setIsLoading(false);
        }
    };

    const loadDownloadDir = async () => {
        try {
            const dir = await invoke("get_download_dir") as string;
            setDownloadDir(dir);
            localStorage.setItem(LOCAL_STORAGE_KEYS.DOWNLOAD_DIR, dir);
        } catch (err) {
            console.error("Failed to load download directory:", err);
            showStatus(`Failed to load download directory: ${err}`, true);
        }
    };

    // Settings Update Handlers
    const handleTokenChange = async (newToken: string) => {
        setToken(newToken);
        localStorage.setItem(LOCAL_STORAGE_KEYS.TOKEN, newToken);

        if (isTauriAvailable) {
            try {
                await invoke("set_token", { token: newToken });
                showStatus("Token saved successfully");
            } catch (err) {
                console.error("Failed to set token:", err);
                showStatus(`Failed to save token to Tauri backend: ${err}`, true);
            }
        } else {
            showStatus("Token saved successfully to browser storage");
        }
    };



    // Check for app updates
    async function checkForAppUpdates() {
        if (!isTauriAvailable) {
            showStatus("Update checking not available in browser mode", true);
            return;
        }

        setIsCheckingUpdate(true);
        try {
            const update = await check();
            if (update === null) {
                await message('Failed to check for updates.\nPlease try again later.', {
                    title: 'Error',
                    kind: 'error',
                    okLabel: 'OK'
                });
                return;
            } else if (update?.available) {
                const yes = await ask(`Update to ${update.version} is available!\n\nRelease notes: ${update.body}`, {
                    title: 'Update Available',
                    kind: 'info',
                    okLabel: 'Update',
                    cancelLabel: 'Cancel'
                });
                if (yes) {
                    await update.downloadAndInstall();
                    // รีสตาร์ทแอพหลังจากอัพเดทเสร็จ
                    await invoke("graceful_restart");
                }
            } else {
                await message('You are on the latest version. Stay awesome!', {
                    title: 'No Update Available',
                    kind: 'info',
                    okLabel: 'OK'
                });
            }
        } catch (error) {
            console.error("Update check failed:", error);
            await message('Failed to check for updates.\nPlease try again later.', {
                title: 'Error',
                kind: 'error',
                okLabel: 'OK'
            });
        } finally {
            setIsCheckingUpdate(false);
        }
    }

    // Action handlers
    const testConnection = async () => {
        if (!isTauriAvailable) {
            showStatus("Test connection not available in browser mode", true);
            return;
        }

        try {
            const result = await invoke("echo_test", { message: "Connection test" });
            showStatus(`Connection test successful: ${result}`);
        } catch (err) {
            showStatus(`Connection test failed: ${err}`, true);
        }
    };



    const saveAllSettings = async () => {
        // Save all to localStorage first
        localStorage.setItem(LOCAL_STORAGE_KEYS.TOKEN, token);
        localStorage.setItem(LOCAL_STORAGE_KEYS.DOWNLOAD_DIR, downloadDir);

        if (isTauriAvailable) {
            try {
                await invoke("save_all_settings", { token });
                showStatus("All settings saved successfully");
            } catch (err) {
                showStatus(`Failed to save all settings to Tauri backend: ${err}`, true);
            }
        } else {
            showStatus("All settings saved successfully to browser storage");
        }
    };

    const selectDownloadDir = async () => {
        if (!isTauriAvailable) {
            showStatus("Directory selection not available in browser mode", true);
            return;
        }

        try {
            const selected = await open({
                directory: true,
                defaultPath: downloadDir || undefined,
            });

            if (selected) {
                setDownloadDir(selected);
                await invoke("set_download_dir", { dir: selected });
                localStorage.setItem(LOCAL_STORAGE_KEYS.DOWNLOAD_DIR, selected);
                showStatus("Download directory updated successfully");
            }
        } catch (err) {
            showStatus(`Failed to select directory: ${err}`, true);
        }
    };

    // UI Components
    const renderStatusAlert = () => (
        statusMessage && (
            <div className={`p-4 rounded-lg mb-4 ${isError ? 'bg-red-900/50 border border-red-500 text-red-200' : 'bg-green-900/50 border border-green-500 text-green-200'}`}>
                <span>{statusMessage}</span>
            </div>
        )
    );

    const renderBrowserModeWarning = () => (
        !isTauriAvailable && (
            <div className="p-4 rounded-lg mb-4 bg-yellow-900/50 border border-yellow-500 text-yellow-200">
                <span>Running in browser mode. Settings will be saved to browser storage only.</span>
            </div>
        )
    );



    const renderApplicationUpdate = () => (
        <>
            <div className="border-t border-gray-700 pt-4 mt-4">
                <h3 className="text-lg font-medium text-gray-200 mb-2">Application Update</h3>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Check for Updates</label>
                <button
                    className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${!isTauriAvailable || isCheckingUpdate ? 'bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500'}`}
                    onClick={checkForAppUpdates}
                    disabled={isCheckingUpdate || !isTauriAvailable}
                >
                    <IconRefresh className={`w-5 h-5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                    {isCheckingUpdate ? "Checking..." : "Check for Updates"}
                </button>
            </div>
        </>
    );

    const renderDownloadDirectory = () => (
        <>
            <div className="border-t border-gray-700 pt-4 mt-4">
                <h3 className="text-lg font-medium text-gray-200 mb-2">Download Directory</h3>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Download Directory</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={downloadDir}
                        readOnly
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Download directory"
                    />
                    <button
                        className={`px-4 py-2 rounded-lg border transition-colors ${!isTauriAvailable ? 'bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500'}`}
                        onClick={selectDownloadDir}
                        disabled={!isTauriAvailable}
                    >
                        Select Directory
                    </button>
                </div>
            </div>
        </>
    );

    const renderActionButtons = () => (
        <div className="flex mt-6 gap-4">
            <button
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                onClick={saveAllSettings}
            >
                Save All Settings
            </button>
        </div>
    );

    // Main Render
    return (
        <div className="flex flex-col h-full w-full p-6 bg-gray-900 text-white">
            {renderStatusAlert()}
            {renderBrowserModeWarning()}

            {isLoading ? (
                <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <>
                    <div className="flex flex-row mb-6">
                        <button
                            className={`px-4 py-2 rounded-lg border transition-colors ${!isTauriAvailable ? 'bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500'}`}
                            onClick={testConnection}
                            disabled={!isTauriAvailable}
                        >
                            Test Connection
                        </button>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Token</label>
                            <input
                                type="text"
                                value={token}
                                onChange={(e) => handleTokenChange(e.target.value)}
                                className="input input-bordered w-full max-w-xs bg-gray-800 border-gray-600 text-white"
                                placeholder="Enter token"
                            />
                        </div>

                        {renderApplicationUpdate()}
                        {renderDownloadDirectory()}
                        {renderActionButtons()}
                    </div>
                </>
            )}
        </div>
    );
}
