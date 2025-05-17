import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { convertFileSrc } from '@tauri-apps/api/core';

interface LaunchConfig {
    executablePath: string;
    launchMethod: 'direct' | 'python' | 'wine' | 'custom';
    customCommand?: string;
}

interface DownloadedFile {
    id: string;
    filename: string;
    path: string;
    status: string;
    extracted: boolean;
    extractedPath?: string;
    downloadedAt: string;
    launchConfig?: LaunchConfig;
    iconPath?: string;
    url?: string;
    provider?: string;
    error?: string | null;
    progress?: number;
    extractionStatus?: 'idle' | 'extracting' | 'completed' | 'failed';
    extractionProgress?: number;
}

interface SavedGameInfo {
    id: string;
    filename: string;
    path: string;
    extracted: boolean;
    extracted_path?: string;
    downloadedAt: string;
    launch_config?: LaunchConfig;
    icon_path?: string;
}

const Games: React.FC = () => {
    const [files, setFiles] = useState<DownloadedFile[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [launchModalOpen, setLaunchModalOpen] = useState<string | null>(null);
    const [selectedExecutable, setSelectedExecutable] = useState<string>('');
    const [launchMethod, setLaunchMethod] = useState<'direct' | 'python' | 'wine' | 'custom'>('direct');
    const [customCommand, setCustomCommand] = useState<string>('');
    const itemsPerPage = 9;

    const getFilename = (path: string): string => {
        return path.split(/[\\/]/).pop() || path;
    };

    const getIconUrl = (iconPath?: string): string => {
        if (!iconPath) {
            return '/default-icon.png'; // Adjust to your default icon path
        }
        return convertFileSrc(iconPath);
    };

    useEffect(() => {
        const fetchDownloadedFiles = async () => {
            try {
                setLoading(true);

                const activeDownloads: DownloadedFile[] = await invoke('get_active_downloads');
                const completedFiles = activeDownloads.filter((file) => file.status === 'completed');

                const savedGames: SavedGameInfo[] = await invoke('get_saved_games');

                const processedActiveFiles = await Promise.all(
                    completedFiles.map(async (file) => {
                        if (file.path) {
                            const extracted = await checkIfExtracted(file.path);
                            return {
                                ...file,
                                filename: getFilename(file.filename),
                                extracted: file.extracted || extracted,
                                extractedPath: file.extractedPath || (extracted ? `${file.path}_extracted` : undefined),
                                url: file.url || '',
                                provider: file.provider || null,
                                extractionStatus: file.extractionStatus || 'idle',
                                extractionProgress: file.extractionProgress || 0,
                            };
                        }
                        return {
                            ...file,
                            filename: getFilename(file.filename),
                            extracted: file.extracted || false,
                            extractedPath: file.extractedPath,
                            url: file.url || '',
                            provider: file.provider || null,
                            extractionStatus: file.extractionStatus || 'idle',
                            extractionProgress: file.extractionProgress || 0,
                        };
                    })
                );

                const processedSavedGames = savedGames.map((game) => ({
                    id: game.id,
                    filename: getFilename(game.filename),
                    path: game.path,
                    status: 'completed',
                    extracted: game.extracted,
                    extractedPath: game.extracted_path,
                    downloadedAt: game.downloadedAt,
                    launchConfig: game.launch_config,
                    iconPath: game.icon_path,
                    url: '',
                    provider: null,
                    error: null,
                    progress: 100.0,
                    extractionStatus: game.extracted ? 'completed' : 'idle',
                    extractionProgress: game.extracted ? 100.0 : 0,
                }));

                const allFilesMap = new Map();
                [...processedActiveFiles, ...processedSavedGames].forEach((file) => {
                    allFilesMap.set(file.id, file);
                });

                const mergedFiles = Array.from(allFilesMap.values());
                mergedFiles.sort((a, b) => {
                    const dateA = new Date(a.downloadedAt || '1970-01-01T00:00:00Z');
                    const dateB = new Date(b.downloadedAt || '1970-01-01T00:00:00Z');
                    return dateB.getTime() - dateA.getTime();
                });

                setFiles(mergedFiles);
            } catch (err) {
                console.error('Error fetching downloads:', err);
                setError('Failed to fetch downloaded files');
            } finally {
                setLoading(false);
            }
        };

        fetchDownloadedFiles();
    }, [refreshKey]);

    useEffect(() => {
        const unsubscribe = listen('extraction-progress', (event: any) => {
            const { downloadId, status, progress, error } = event.payload;
            setFiles((prev) =>
                prev.map((file) =>
                    file.id === downloadId
                        ? {
                            ...file,
                            extractionStatus: status,
                            extractionProgress: progress,
                            error: error || file.error,
                            extracted: status === 'completed' ? true : file.extracted,
                            extractedPath: status === 'completed' ? `${file.path}_extracted` : file.extractedPath,
                        }
                        : file
                )
            );
        });

        return () => {
            unsubscribe.then((unsub) => unsub());
        };
    }, []);

    useEffect(() => {
        const saveGamesToConfig = async () => {
            if (files.length === 0) return;

            try {
                const gamesToSave = files.map((file) => ({
                    id: file.id,
                    filename: file.filename,
                    url: file.url || '',
                    progress: file.progress || 100.0,
                    status: file.status || 'completed',
                    path: file.path || null,
                    error: file.error || null,
                    provider: file.provider || null,
                    downloaded_at: file.downloadedAt,
                    extracted: file.extracted,
                    extracted_path: file.extractedPath,
                    launch_config: file.launchConfig,
                    icon_path: file.iconPath,
                    extraction_status: file.extractionStatus || 'idle',
                    extraction_progress: file.extractionProgress || 0,
                }));

                await invoke('save_games', { games: gamesToSave });
                console.log('Games saved to config successfully');
            } catch (err) {
                console.error('Error saving games to config:', err);
            }
        };
        saveGamesToConfig();
    }, [files]);

    const checkIfExtracted = async (path: string): Promise<boolean> => {
        if (!path) return false;
        const extractedDir = `${path}_extracted`;
        try {
            const exists = await invoke('check_path_exists', { path: extractedDir }) as boolean;
            return exists;
        } catch (err) {
            console.error(`Error checking path ${extractedDir}:`, err);
            return false;
        }
    };

    const isExtractable = (filename: string): boolean => {
        return /\.(zip|7z|rar)$/i.test(filename);
    };

    const handleExtract = async (file: DownloadedFile) => {
        if (!file.path) {
            setError('File path is missing');
            return;
        }

        try {
            const outputDir = `${file.path}_extracted`;
            await invoke('unarchive_file', {
                filePath: file.path,
                outputDir,
                downloadId: file.id,
            });
        } catch (err) {
            console.error(`Error extracting ${file.filename}:`, err);
            setError(`Failed to extract ${file.filename}: ${err}`);
            await invoke('show_download_notification', {
                title: 'Extraction Failed',
                message: `Could not extract ${file.filename}: ${err}`,
            });
        }
    };

    const handleOpen = async (path: string) => {
        try {
            if (!path) {
                throw new Error('Path is missing');
            }

            const exists = await invoke('check_path_exists', { path });
            if (!exists) {
                console.error(`Path does not exist: ${path}`);
                setError(`Unable to open: Path "${path}" does not exist`);
                return;
            }

            const isDir = await invoke('is_directory', { path });

            console.log(`Opening ${isDir ? 'directory' : 'file'}: ${path}`);

            if (isDir) {
                await invoke('open_directory', { path });
            } else {
                await invoke('open_file', { path });
            }
        } catch (err) {
            console.error(`Failed to open path ${path}:`, err);
            setError(`Failed to open path: ${err}`);
        }
    };

    const handleSelectExecutable = async (gameId: string) => {
        try {
            const game = files.find((f) => f.id === gameId);

            if (!game || !game.extractedPath) {
                setError('Extract the game first before selecting an executable');
                return;
            }

            const executablePath = await invoke('select_game_executable', {
                gameId,
                startPath: game.extractedPath,
            });

            setSelectedExecutable(executablePath as string);

            if (executablePath) {
                try {
                    const iconPath = await invoke('extract_icon', { executablePath });
                    setFiles((prev) =>
                        prev.map((f) => (f.id === gameId ? { ...f, iconPath: iconPath as string } : f))
                    );
                } catch (iconErr) {
                    console.warn('Could not extract icon, using default or no icon:', iconErr);
                    setFiles((prev) =>
                        prev.map((f) => (f.id === gameId ? { ...f, iconPath: undefined } : f))
                    );
                }
            }
        } catch (err) {
            console.error('Error selecting executable:', err);
            setError('Failed to select executable');
        }
    };

    const handleLaunchGame = async (file: DownloadedFile) => {
        if (!file.launchConfig) {
            setLaunchModalOpen(file.id);
            return;
        }

        try {
            await invoke('launch_game', {
                gameId: file.id,
                launchConfig: file.launchConfig,
            });
        } catch (err) {
            console.error('Error launching game:', err);
            setError(`Failed to launch game: ${err}`);
        }
    };

    const handleChangeIcon = async (gameId: string) => {
        try {
            const file = await open({
                filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }],
            });
            if (file) {
                setFiles((prev) =>
                    prev.map((f) => (f.id === gameId ? { ...f, iconPath: file as string } : f))
                );
                await invoke('save_launch_config', {
                    gameId,
                    launchConfig: files.find((f) => f.id === gameId)?.launchConfig,
                    iconPath: file,
                });
            }
        } catch (err) {
            console.error('Error changing icon:', err);
            setError('Failed to change icon');
        }
    };

    const saveLaunchConfig = async (gameId: string) => {
        const launchConfig: LaunchConfig = {
            executablePath: selectedExecutable,
            launchMethod,
            customCommand: launchMethod === 'custom' ? customCommand : undefined,
        };

        try {
            await invoke('save_launch_config', {
                gameId,
                launchConfig,
                iconPath: files.find((f) => f.id === gameId)?.iconPath,
            });
            setFiles((prev) =>
                prev.map((f) => (f.id === gameId ? { ...f, launchConfig } : f))
            );
            setLaunchModalOpen(null);
            setSelectedExecutable('');
            setLaunchMethod('direct');
            setCustomCommand('');
        } catch (err) {
            console.error('Error saving launch config:', err);
            setError('Failed to save launch configuration');
        }
    };

    const renderFileContent = (file: DownloadedFile) => {
        if (!file.path) {
            return <p className="text-sm text-warning">File path missing</p>;
        }

        if (!file.extracted || !file.extractedPath) {
            if (!isExtractable(file.filename)) {
                return <p className="text-sm text-warning">File format not supported for extraction</p>;
            }

            if (file.extractionStatus === 'extracting') {
                return (
                    <div className="flex flex-col gap-2">
                        <p className="text-sm">Extracting...</p>
                        <progress
                            className="progress progress-primary w-full"
                            value={file.extractionProgress || 0}
                            max="100"
                        ></progress>
                        <p className="text-sm text-center">{(file.extractionProgress || 0).toFixed(1)}%</p>
                    </div>
                );
            }

            if (file.extractionStatus === 'failed') {
                return (
                    <div className="flex flex-col gap-2">
                        <p className="text-sm text-error">Extraction failed: {file.error}</p>
                        <button className="btn btn-primary btn-block" onClick={() => handleExtract(file)}>
                            Retry Extraction
                        </button>
                    </div>
                );
            }

            return (
                <button
                    className="btn btn-primary btn-block"
                    onClick={() => handleExtract(file)}
                    disabled={file.extractionStatus === 'extracting' as DownloadedFile['extractionStatus']}
                >
                    Extract File
                </button>
            );
        }

        return (
            <div className="flex flex-col gap-2">
                {file.iconPath && (
                    <div className="flex items-center gap-2">
                        <img
                            src={getIconUrl(file.iconPath)}
                            alt={`${file.filename} icon`}
                            className="w-16 h-16 object-contain bg-base-300 p-1 rounded"
                            onError={(e) => {
                                e.currentTarget.src = '/default-icon.png';
                            }}
                        />
                        <button className="btn btn-sm btn-outline" onClick={() => handleChangeIcon(file.id)}>
                            Change Icon
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    <button
                        className="btn btn-outline w-full"
                        onClick={() => handleOpen(file.path!)}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 mr-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
                            />
                        </svg>
                        Archive Location
                    </button>
                    <button
                        className="btn btn-outline btn-info w-full"
                        onClick={() => handleOpen(file.extractedPath!)}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 mr-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                            />
                        </svg>
                        Extracted Files
                    </button>
                </div>

                <div className="bg-base-300 rounded p-2 text-xs mt-1">
                    <div className="font-medium">Extracted to:</div>
                    <div className="overflow-hidden text-ellipsis whitespace-nowrap" title={file.extractedPath}>
                        {file.extractedPath}
                    </div>
                </div>

                <button
                    className="btn btn-primary w-full mt-2"
                    onClick={() => handleLaunchGame(file)}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    {file.launchConfig ? 'Launch Game' : 'Configure Launch'}
                </button>
            </div>
        );
    };

    const renderLaunchModal = () => {
        if (!launchModalOpen) return null;
        const game = files.find((f) => f.id === launchModalOpen);

        if (!game) return null;

        const isGameExtracted = game.extracted && game.extractedPath;
        const isExtracting = game.extractionStatus === 'extracting';

        return (
            <div className="modal modal-open">
                <div className="modal-box max-w-2xl bg-base-200 shadow-2xl">
                    <div className="flex items-center gap-4 mb-6 border-b pb-4">
                        {game.iconPath ? (
                            <img
                                src={getIconUrl(game.iconPath)}
                                alt={`${game.filename} icon`}
                                className="w-16 h-16 rounded-lg object-contain bg-base-300 p-1"
                                onError={(e) => {
                                    e.currentTarget.src = '/default-icon.png';
                                }}
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-lg bg-base-300 flex items-center justify-center">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="w-8 h-8 opacity-50"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M4 14h4v4h12V6h-4V2H4z" />
                                    <path d="M12 16l-4-4 4-4" />
                                </svg>
                            </div>
                        )}
                        <div>
                            <h3 className="font-bold text-xl">{game.filename}</h3>
                            <p className="text-sm opacity-80">Configure launch settings</p>
                        </div>
                        <button
                            className="btn btn-sm btn-circle absolute right-4 top-4"
                            onClick={() => setLaunchModalOpen(null)}
                        >
                            ✕
                        </button>
                    </div>

                    {isExtracting ? (
                        <div className="alert alert-info mb-4">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="stroke-current shrink-0 h-6 w-6"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <div>
                                <h3 className="font-bold">Extraction in Progress</h3>
                                <p className="text-sm">Please wait until the extraction is complete.</p>
                                <progress
                                    className="progress progress-primary w-full"
                                    value={game.extractionProgress || 0}
                                    max="100"
                                ></progress>
                                <p className="text-sm text-center">{(game.extractionProgress || 0).toFixed(1)}%</p>
                            </div>
                        </div>
                    ) : !isGameExtracted ? (
                        <div className="alert alert-warning mb-4">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="stroke-current shrink-0 h-6 w-6"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                            <div>
                                <h3 className="font-bold">Extract Required</h3>
                                <p className="text-sm">Please extract the game files first before configuring launch settings.</p>
                            </div>
                            <button
                                className="btn btn-sm btn-warning"
                                onClick={() => {
                                    setLaunchModalOpen(null);
                                    if (game.path) {
                                        handleExtract(game);
                                    }
                                }}
                            >
                                Extract Now
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-medium">Executable File</span>
                                    {game.extractedPath && (
                                        <span className="label-text-alt">From: {game.extractedPath}</span>
                                    )}
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={selectedExecutable}
                                        readOnly
                                        placeholder="Select an executable file to launch"
                                        className="input input-bordered flex-1"
                                    />
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => handleSelectExecutable(launchModalOpen)}
                                    >
                                        Browse
                                    </button>
                                </div>
                                {selectedExecutable && <p className="text-xs mt-1 opacity-70">{selectedExecutable}</p>}
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-medium">Launch Method</span>
                                </label>
                                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                                    <div
                                        className={`border rounded-lg p-3 cursor-pointer transition-all hover:bg-base-300 ${
                                            launchMethod === 'direct' ? 'border-primary bg-base-300 ring-1 ring-primary' : 'border-base-300'
                                        }`}
                                        onClick={() => setLaunchMethod('direct')}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-6 w-6 mx-auto mb-2"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M5 3v16h14V3H5zm3 14h8V9H8v8zm0-10h8V5H8v2z"
                                            />
                                        </svg>
                                        <div className="text-center text-sm">Direct (.exe)</div>
                                    </div>


                                    <div
                                        className={`border rounded-lg p-3 cursor-pointer transition-all hover:bg-base-300 ${
                                            launchMethod === 'python' ? 'border-primary bg-base-300 ring-1 ring-primary' : 'border-base-300'
                                        }`}
                                        onClick={() => setLaunchMethod('python')}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-6 w-6 mx-auto mb-2"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"
                                            />
                                        </svg>
                                        <div className="text-center text-sm">Python Script</div>
                                    </div>
                                    <div
                                        className={`border rounded-lg p-3 cursor-pointer transition-all hover:bg-base-300 ${
                                            launchMethod === 'wine' ? 'border-primary bg-base-300 ring-1 ring-primary' : 'border-base-300'
                                        }`}
                                        onClick={() => setLaunchMethod('wine')}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-6 w-6 mx-auto mb-2"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                                            />
                                        </svg>
                                        <div className="text-center text-sm">Wine</div>
                                    </div>
                                    <div
                                        className={`border rounded-lg p-3 cursor-pointer transition-all hover:bg-base-300 ${
                                            launchMethod === 'custom' ? 'border-primary bg-base-300 ring-1 ring-primary' : 'border-base-300'
                                        }`}
                                        onClick={() => setLaunchMethod('custom')}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-6 w-6 mx-auto mb-2"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                            />
                                        </svg>
                                        <div className="text-center text-sm">Custom</div>
                                    </div>
                                </div>
                            </div>

                            {launchMethod === 'custom' && (
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-medium">Custom Command</span>
                                    </label>
                                    <textarea
                                        value={customCommand}
                                        onChange={(e) => setCustomCommand(e.target.value)}
                                        className="textarea textarea-bordered h-24"
                                        placeholder="Enter custom launch command"
                                    ></textarea>
                                    <div className="text-xs mt-1 opacity-70">
                                        Example: /path/to/emulator "/path/to/game.rom" --fullscreen
                                    </div>
                                </div>
                            )}

                            <div className="bg-base-300 p-4 rounded-lg">
                                <h4 className="font-medium mb-2">About this launch method</h4>
                                <p className="text-sm">
                                    {launchMethod === 'direct' && 'Directly launches Windows .exe files on Windows systems.'}
                                    {launchMethod === 'python' && 'Runs the file using Python interpreter. Useful for Python-based games and tools.'}
                                    {launchMethod === 'wine' && 'Uses Wine to run Windows applications on Linux or macOS systems.'}
                                    {launchMethod === 'custom' && 'Define your own launch command that will be used to start the game or application.'}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="modal-action mt-6 space-x-2">
                        <button className="btn btn-outline" onClick={() => setLaunchModalOpen(null)}>
                            Cancel
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={() => saveLaunchConfig(launchModalOpen)}
                            disabled={isExtracting || !isGameExtracted || !selectedExecutable || (launchMethod === 'custom' && !customCommand)}
                        >
                            Save Configuration
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const totalPages = Math.ceil(files.length / itemsPerPage);
    const paginatedFiles = files.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen">
            <div className="w-64 bg-base-200 p-4">
                <h2 className="text-xl font-bold mb-4">Registered Games</h2>
                <button
                    className="btn btn-outline w-full mb-4"
                    onClick={() => setRefreshKey((prev) => prev + 1)}
                >
                    Refresh List
                </button>
                <div className="flex flex-col gap-2">
                    {files.map((file) => (
                        <button
                            key={file.id}
                            className="btn btn-ghost justify-start flex items-center gap-2"
                            onClick={() => handleOpen(file.path)}
                        >
                            {file.iconPath ? (
                                <img
                                    src={getIconUrl(file.iconPath)}
                                    alt={`${file.filename} icon`}
                                    className="w-6 h-6 object-contain"
                                    onError={(e) => {
                                        e.currentTarget.src = '/default-icon.png';
                                    }}
                                />
                            ) : (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="w-6 h-6 opacity-50"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M4 14h4v4h12V6h-4V2H4z" />
                                    <path d="M12 16l-4-4 4-4" />
                                </svg>
                            )}
                            <span className="flex-1 text-left">{file.filename}</span>
                            {file.extractionStatus === 'extracting' && (
                                <span className="text-xs text-info">Extracting...</span>
                            )}
                            {file.extractionStatus === 'failed' && (
                                <span className="text-xs text-error">Failed</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 p-4">
                <h1 className="text-3xl font-bold mb-6">Downloaded Games</h1>

                {error && (
                    <div className="alert alert-error shadow-lg mb-4">
                        <div>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="stroke-current flex-shrink-0 h-6 w-6"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <span>{error}</span>
                        </div>
                        <div className="flex-none">
                            <button
                                className="btn btn-sm"
                                onClick={() => setRefreshKey((prev) => prev + 1)}
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                )}

                {files.length === 0 ? (
                    <div className="alert alert-info">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            className="stroke-current flex-shrink-0 w-6 h-6"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        <span>No downloaded files found. Try downloading some games first.</span>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-3 gap-4">
                            {paginatedFiles.map((file) => (
                                <div key={file.id} className="card bg-base-100 shadow-xl">
                                    <div className="card-body">
                                        <h2 className="card-title">{file.filename}</h2>
                                        <p>Status: {file.extracted ? 'Extracted' : 'Not Extracted'}</p>
                                        <p>Path: {file.path || 'Not available'}</p>
                                        <div className="card-actions justify-between">
                                            {file.path && (
                                                <button
                                                    className="btn btn-outline"
                                                    onClick={() => handleOpen(file.path!)}
                                                >
                                                    Open File Location
                                                </button>
                                            )}
                                            <div>{renderFileContent(file)}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div className="flex justify-center mt-6">
                                <div className="join">
                                    <button
                                        className="join-item btn"
                                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                    >
                                        «
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                        <button
                                            key={page}
                                            className={`join-item btn ${currentPage === page ? 'btn-active' : ''}`}
                                            onClick={() => setCurrentPage(page)}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                    <button
                                        className="join-item btn"
                                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                    >
                                        »
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
                {renderLaunchModal()}
            </div>
        </div>
    );
};

export default Games;