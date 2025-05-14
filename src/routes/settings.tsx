import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import themes from "../utils/themes";
import { useSettingsContext } from "../context/SettingsProvider";

// Types and constants
interface CloudinaryConfig {
    cloud_name: string;
    api_key: string;
    api_secret: string;
}

const LOCAL_STORAGE_KEYS = {
    TOKEN: 'chanomhub_token',
    CLOUDINARY: 'chanomhub_cloudinary',
    DOWNLOAD_DIR: 'chanomhub_download_dir',
    THEME: 'chanomhub_theme'
};

const DEFAULT_PROFILE_URL = "https://chanomhub.online/member/settings#profile";

export default function Settings() {
    const { setTheme, theme: currentTheme } = useSettingsContext();
    // State
    const [token, setToken] = useState("");
    const [cloudinaryConfig, setCloudinaryConfig] = useState<CloudinaryConfig>({
        cloud_name: "",
        api_key: "",
        api_secret: "",
    });
    const [downloadDir, setDownloadDir] = useState("");
    const [statusMessage, setStatusMessage] = useState("");
    const [isError, setIsError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isTauriAvailable, setIsTauriAvailable] = useState(true);

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

            // Load Cloudinary config
            const storedCloudinary = localStorage.getItem(LOCAL_STORAGE_KEYS.CLOUDINARY);
            if (storedCloudinary) {
                const parsed = JSON.parse(storedCloudinary);
                if (
                    parsed &&
                    typeof parsed === "object" &&
                    "cloud_name" in parsed &&
                    "api_key" in parsed &&
                    "api_secret" in parsed
                ) {
                    setCloudinaryConfig({
                        cloud_name: parsed.cloud_name,
                        api_key: parsed.api_key,
                        api_secret: parsed.api_secret,
                    });
                } else {
                    console.error("Invalid Cloudinary config in localStorage");
                    showStatus("Invalid Cloudinary config in localStorage", true);
                }
            }

            // Load download directory
            const storedDownloadDir = localStorage.getItem(LOCAL_STORAGE_KEYS.DOWNLOAD_DIR);
            if (storedDownloadDir) setDownloadDir(storedDownloadDir);

            // Load theme
            const storedTheme = localStorage.getItem(LOCAL_STORAGE_KEYS.THEME);
            if (storedTheme) setTheme(storedTheme);

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
            const retrievedToken = await invoke<string>("get_token");
            if (typeof retrievedToken === "string" && retrievedToken) {
                setToken(retrievedToken);
                localStorage.setItem(LOCAL_STORAGE_KEYS.TOKEN, retrievedToken);
            } else {
                // Handle empty or expired token
                setToken(""); // Clear the token state
                localStorage.removeItem(LOCAL_STORAGE_KEYS.TOKEN); // remove from local storage
                showStatus(
                    <>
                        Token is empty or expired. Please update your token in your{" "}
                        <a
                            href={DEFAULT_PROFILE_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                        >
                            profile settings
                        </a>
                        .
                    </>,
                    true
                );
            }

            // Load Cloudinary config
            const config = await invoke<CloudinaryConfig>("get_cloudinary_config");
            if (config) {
                const cloudConfig: CloudinaryConfig = {
                    cloud_name: config.cloud_name || "",
                    api_key: config.api_key || "",
                    api_secret: config.api_secret || "",
                };
                setCloudinaryConfig(cloudConfig);
                localStorage.setItem(LOCAL_STORAGE_KEYS.CLOUDINARY, JSON.stringify(cloudConfig));
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
            const dir = await invoke<string>("get_download_dir");
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

    const handleCloudinaryChange = async (field: keyof CloudinaryConfig, value: string) => {
        const newConfig = { ...cloudinaryConfig, [field]: value };
        setCloudinaryConfig(newConfig);
        localStorage.setItem(LOCAL_STORAGE_KEYS.CLOUDINARY, JSON.stringify(newConfig));

        if (isTauriAvailable) {
            try {
                await invoke("set_cloudinary_config", {
                    cloudName: newConfig.cloud_name,
                    apiKey: newConfig.api_key,
                    apiSecret: newConfig.api_secret,
                });
                showStatus(`Cloudinary ${field} updated successfully`);
            } catch (err) {
                console.error("Failed to set Cloudinary config:", err);
                showStatus(`Failed to save Cloudinary settings to Tauri backend: ${err}`, true);
            }
        } else {
            showStatus(`Cloudinary ${field} updated successfully in browser storage`);
        }
    };

    const handleThemeChange = (theme: string) => {
        setTheme(theme);
        localStorage.setItem(LOCAL_STORAGE_KEYS.THEME, theme);
    };

    // Action handlers
    const testConnection = async () => {
        if (!isTauriAvailable) {
            showStatus("Test connection not available in browser mode", true);
            return;
        }

        try {
            const result = await invoke<string>("echo_test", { message: "Connection test" });
            showStatus(`Connection test successful: ${result}`);
        } catch (err) {
            showStatus(`Connection test failed: ${err}`, true);
        }
    };

    const verifyCloudinaryConfig = async () => {
        if (isTauriAvailable) {
            try {
                const config = await invoke<CloudinaryConfig>("get_cloudinary_config");
                if (config) {
                    const configStr = JSON.stringify(config, null, 2);
                    showStatus(`Configuration verified: ${configStr}`);
                } else {
                    showStatus("Config empty or invalid", true);
                }
            } catch (err) {
                showStatus(`Failed to verify configuration: ${err}`, true);
            }
        } else {
            const storedConfig = localStorage.getItem(LOCAL_STORAGE_KEYS.CLOUDINARY);
            if (storedConfig) {
                showStatus(`Browser configuration: ${storedConfig}`);
            } else {
                showStatus("No Cloudinary configuration found in browser storage", true);
            }
        }
    };

    const saveAllSettings = async () => {
        // Save all to localStorage first
        localStorage.setItem(LOCAL_STORAGE_KEYS.TOKEN, token);
        localStorage.setItem(LOCAL_STORAGE_KEYS.CLOUDINARY, JSON.stringify(cloudinaryConfig));
        localStorage.setItem(LOCAL_STORAGE_KEYS.DOWNLOAD_DIR, downloadDir);
        localStorage.setItem(LOCAL_STORAGE_KEYS.THEME, currentTheme);

        if (isTauriAvailable) {
            try {
                await invoke("save_all_settings", {
                    token,
                    cloudinaryConfig: {
                        cloud_name: cloudinaryConfig.cloud_name,
                        api_key: cloudinaryConfig.api_key,
                        api_secret: cloudinaryConfig.api_secret,
                    },
                });
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
            <div className={`alert ${isError ? 'alert-error' : 'alert-success'} mb-4`}>
                <span>{statusMessage}</span>
            </div>
        )
    );

    const renderBrowserModeWarning = () => (
        !isTauriAvailable && (
            <div className="alert alert-warning mb-4">
                <span>Running in browser mode. Settings will be saved to browser storage only.</span>
            </div>
        )
    );

    const renderThemeSelector = () => (
        <div className="dropdown">
            <label tabIndex={0} className="btn m-1">
                Choose Theme
            </label>
            <ul
                tabIndex={0}
                className="dropdown-content z-[1] p-2 shadow bg-base-100 rounded-box max-h-60 w-52 overflow-y-scroll"
            >
                {themes.map((theme) => (
                    <li
                        key={theme}
                        className={clsx("hover:bg-primary-focus w-full p-2 rounded-md", {
                            "bg-secondary-focus": theme === currentTheme,
                        })}
                        onClick={() => handleThemeChange(theme)}
                    >
                        {theme}
                    </li>
                ))}
            </ul>
        </div>
    );

    const renderCloudinaryFields = () => (
        <>
            <div className="divider">Cloudinary Configuration</div>

            <div>
                <label className="block text-sm font-medium">Cloudinary Cloud Name</label>
                <input
                    type="text"
                    value={cloudinaryConfig.cloud_name}
                    onChange={(e) => handleCloudinaryChange("cloud_name", e.target.value)}
                    className="input input-bordered w-full max-w-xs"
                    placeholder="Enter Cloudinary cloud name"
                />
            </div>

            <div>
                <label className="block text-sm font-medium">Cloudinary API Key</label>
                <input
                    type="text"
                    value={cloudinaryConfig.api_key}
                    onChange={(e) => handleCloudinaryChange("api_key", e.target.value)}
                    className="input input-bordered w-full max-w-xs"
                    placeholder="Enter Cloudinary API key"
                />
            </div>

            <div>
                <label className="block text-sm font-medium">Cloudinary API Secret</label>
                <input
                    type="password"
                    value={cloudinaryConfig.api_secret}
                    onChange={(e) => handleCloudinaryChange("api_secret", e.target.value)}
                    className="input input-bordered w-full max-w-xs"
                    placeholder="Enter Cloudinary API secret"
                />
            </div>
        </>
    );

    const renderDownloadDirectory = () => (
        <>
            <div className="divider">Download Directory</div>
            <div>
                <label className="block text-sm font-medium">Download Directory</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={downloadDir}
                        readOnly
                        className="input input-bordered w-full max-w-xs"
                        placeholder="Download directory"
                    />
                    <button
                        className={`btn btn-outline ${!isTauriAvailable ? 'btn-disabled' : ''}`}
                        onClick={selectDownloadDir}
                    >
                        Select Directory
                    </button>
                </div>
            </div>
        </>
    );

    const renderActionButtons = () => (
        <div className="flex mt-4 gap-4">
            <button
                className="btn btn-primary"
                onClick={verifyCloudinaryConfig}
            >
                Verify Configuration
            </button>

            <button
                className="btn btn-success"
                onClick={saveAllSettings}
            >
                Save All Settings
            </button>
        </div>
    );

    // Main Render
    return (
        <div className="flex flex-col h-full w-full p-6">
            {renderStatusAlert()}
            {renderBrowserModeWarning()}

            {isLoading ? (
                <div className="flex justify-center items-center h-32">
                    <span className="loading loading-spinner loading-lg"></span>
                </div>
            ) : (
                <>
                    <div className="flex flex-row mb-6">
                        {renderThemeSelector()}

                        <button
                            className={`btn btn-outline ml-4 ${!isTauriAvailable ? 'btn-disabled' : ''}`}
                            onClick={testConnection}
                        >
                            Test Connection
                        </button>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm font-medium">Token</label>
                            <input
                                type="text"
                                value={token}
                                onChange={(e) => handleTokenChange(e.target.value)}
                                className="input input-bordered w-full max-w-xs"
                                placeholder="Enter token"
                            />
                        </div>

                        {renderCloudinaryFields()}
                        {renderDownloadDirectory()}
                        {renderActionButtons()}
                    </div>
                </>
            )}
        </div>
    );
}
