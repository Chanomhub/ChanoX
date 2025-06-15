import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { convertFileSrc } from '@tauri-apps/api/core';
import { DownloadedFile, SavedGameInfo, LaunchConfig } from './types/types';

// Reusable Game Card Component
const GameCard: React.FC<{
    file: DownloadedFile;
    handleExtract: (file: DownloadedFile) => void;
    handleOpen: (path: string) => void;
    handleLaunchGame: (file: DownloadedFile) => void;
    handleChangeIcon: (gameId: string) => void;
}> = ({ file, handleExtract, handleOpen, handleLaunchGame, handleChangeIcon }) => {
    const getIconUrl = (iconPath?: string): string =>
        iconPath ? convertFileSrc(iconPath) : '/icon.webp';

    const isExtractable = (filename: string): boolean => /\.(zip|7z|rar)$/i.test(filename);

    return (
        <div className="card bg-base-100 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 rounded-xl overflow-hidden">
            <div className="card-body p-4">
                <div className="flex items-center gap-3 mb-3">
                    <img
                        src={getIconUrl(file.iconPath)}
                        alt={`${file.filename} icon`}
                        className="w-12 h-12 rounded-lg object-contain bg-base-200 p-1"
                        onError={(e) => (e.currentTarget.src = '/icon.webp')}
                    />
                    <h2 className="card-title text-lg font-semibold truncate">{file.filename}</h2>
                </div>
                <p className="text-sm text-base-content/70">
                    Status: {file.extracted ? 'Extracted' : 'Not Extracted'}
                </p>
                <p className="text-sm text-base-content/70 truncate" title={file.path}>
                    Path: {file.path || 'Not available'}
                </p>
                <div className="card-actions flex flex-col gap-2 mt-4">
                    {!file.extracted && isExtractable(file.filename) && file.path && (
                        file.extractionStatus === 'extracting' ? (
                            <div className="w-full">
                                <p className="text-sm text-info mb-1">Extracting...</p>
                                <progress
                                    className="progress progress-primary w-full"
                                    value={file.extractionProgress || 0}
                                    max="100"
                                />
                                <p className="text-sm text-center mt-1">
                                    {(file.extractionProgress || 0).toFixed(1)}%
                                </p>
                            </div>
                        ) : file.extractionStatus === 'failed' ? (
                            <div className="w-full">
                                <p className="text-sm text-error mb-1">Extraction failed: {file.error}</p>
                                <button
                                    className="btn btn-primary btn-sm w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/80 hover:to-primary"
                                    onClick={() => handleExtract(file)}
                                >
                                    Retry Extraction
                                </button>
                            </div>
                        ) : (
                            <button
                                className="btn btn-primary btn-sm w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/80 hover:to-primary"
                                onClick={() => handleExtract(file)}
                                disabled={file.extractionStatus === 'extracting' as DownloadedFile['extractionStatus']}
                            >
                                Extract File
                            </button>
                        )
                    )}
                    {file.extracted && file.extractedPath && (
                        <>
                            <div className="flex gap-2">
                                <button
                                    className="btn btn-outline btn-sm flex-1"
                                    onClick={() => handleOpen(file.path!)}
                                >
                                    Archive Location
                                </button>
                                <button
                                    className="btn btn-outline btn-info btn-sm flex-1"
                                    onClick={() => handleOpen(file.extractedPath!)}
                                >
                                    Extracted Files
                                </button>
                            </div>
                            <button
                                className="btn btn-outline btn-sm w-full"
                                onClick={() => handleChangeIcon(file.id)}
                            >
                                Change Icon
                            </button>
                            <button
                                className="btn btn-primary btn-sm w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/80 hover:to-primary"
                                onClick={() => handleLaunchGame(file)}
                            >
                                {file.launchConfig ? 'Launch Game' : 'Configure Launch'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// Reusable Launch Modal Component
const LaunchModal: React.FC<{
    game: DownloadedFile | undefined;
    launchModalOpen: string | null;
    setLaunchModalOpen: (id: string | null) => void;
    selectedExecutable: string;
    setSelectedExecutable: (path: string) => void;
    launchMethod: 'direct' | 'python' | 'wine' | 'custom';
    setLaunchMethod: (method: 'direct' | 'python' | 'wine' | 'custom') => void;
    customCommand: string;
    setCustomCommand: (command: string) => void;
    handleSelectExecutable: (gameId: string) => void;
    saveLaunchConfig: (gameId: string) => void;
    handleExtract: (file: DownloadedFile) => void;
}> = ({
          game,
          launchModalOpen,
          setLaunchModalOpen,
          selectedExecutable,
          launchMethod,
          setLaunchMethod,
          customCommand,
          setCustomCommand,
          handleSelectExecutable,
          saveLaunchConfig,
          handleExtract,
      }) => {
    if (!launchModalOpen || !game) return null;

    const getIconUrl = (iconPath?: string): string =>
        iconPath ? convertFileSrc(iconPath) : '/icon.webp';

    const isGameExtracted = game.extracted && game.extractedPath;
    const isExtracting = game.extractionStatus === 'extracting';

    return (
        <div className="modal modal-open animate-fade-in">
            <div className="modal-box max-w-lg bg-base-200/95 backdrop-blur-sm shadow-2xl rounded-2xl p-6">
                <div className="flex items-center gap-4 mb-6 border-b border-base-300 pb-4">
                    <img
                        src={getIconUrl(game.iconPath)}
                        alt={`${game.filename} icon`}
                        className="w-12 h-12 rounded-lg object-contain bg-base-300 p-1"
                        onError={(e) => (e.currentTarget.src = '/icon.webp')}
                    />
                    <div>
                        <h3 className="font-bold text-xl">{game.filename}</h3>
                        <p className="text-sm text-base-content/70">Configure launch settings</p>
                    </div>
                    <button
                        className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
                        onClick={() => setLaunchModalOpen(null)}
                    >
                        ✕
                    </button>
                </div>
                {isExtracting ? (
                    <div className="alert alert-info mb-4 rounded-lg">
                        <div className="flex-1">
                            <h3 className="font-semibold">Extraction in Progress</h3>
                            <p className="text-sm">Please wait until the extraction is complete.</p>
                            <progress
                                className="progress progress-primary w-full mt-2"
                                value={game.extractionProgress || 0}
                                max="100"
                            />
                            <p className="text-sm text-center mt-1">{(game.extractionProgress || 0).toFixed(1)}%</p>
                        </div>
                    </div>
                ) : !isGameExtracted ? (
                    <div className="alert alert-warning mb-4 rounded-lg">
                        <div className="flex-1">
                            <h3 className="font-semibold">Extract Required</h3>
                            <p className="text-sm">Please extract the game files first.</p>
                        </div>
                        <button
                            className="btn btn-sm btn-warning"
                            onClick={() => {
                                setLaunchModalOpen(null);
                                if (game.path) handleExtract(game);
                            }}
                        >
                            Extract Now
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-medium">Executable File</span>
                                {game.extractedPath && (
                                    <span className="label-text-alt text-base-content/70">
                    From: {game.extractedPath}
                  </span>
                                )}
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={selectedExecutable}
                                    readOnly
                                    placeholder="Select an executable file"
                                    className="input input-bordered flex-1"
                                />
                                <button
                                    className="btn btn-primary btn-sm bg-gradient-to-r from-primary to-primary/80"
                                    onClick={() => handleSelectExecutable(launchModalOpen)}
                                >
                                    Browse
                                </button>
                            </div>
                        </div>
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-medium">Launch Method</span>
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {(['direct', 'python', 'wine', 'custom'] as const).map((method) => (
                                    <div
                                        key={method}
                                        className={`border rounded-lg p-3 cursor-pointer transition-all hover:bg-base-300 ${
                                            launchMethod === method
                                                ? 'border-primary bg-base-300 ring-1 ring-primary'
                                                : 'border-base-300'
                                        }`}
                                        onClick={() => setLaunchMethod(method)}
                                    >
                                        <div className="text-center text-sm capitalize">{method}</div>
                                    </div>
                                ))}
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
                                    className="textarea textarea-bordered h-20"
                                    placeholder="Enter custom launch command"
                                />
                            </div>
                        )}
                    </div>
                )}
                <div className="modal-action mt-6 flex justify-end gap-2">
                    <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setLaunchModalOpen(null)}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary btn-sm bg-gradient-to-r from-primary to-primary/80"
                        onClick={() => saveLaunchConfig(launchModalOpen)}
                        disabled={
                            isExtracting ||
                            !isGameExtracted ||
                            !selectedExecutable ||
                            (launchMethod === 'custom' && !customCommand)
                        }
                    >
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};

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

    const getFilename = (path: string): string => path.split(/[\\/]/).pop() || path;

    useEffect(() => {
        const fetchDownloadedFiles = async () => {
            try {
                setLoading(true);
                const activeDownloads: DownloadedFile[] = await invoke('get_active_downloads');
                const completedFiles = activeDownloads.filter((file) => file.status === 'completed');
                const savedGames: SavedGameInfo[] = await invoke('get_saved_games');

                const processedActiveFiles = await Promise.all(
                    completedFiles.map(async (file) => {
                        const extracted = file.path ? await checkIfExtracted(file.path) : file.extracted;
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
                [...processedActiveFiles, ...processedSavedGames].forEach((file) =>
                    allFilesMap.set(file.id, file)
                );

                const mergedFiles = Array.from(allFilesMap.values()).sort(
                    (a, b) =>
                        new Date(b.downloadedAt || '1970-01-01T00:00:00Z').getTime() -
                        new Date(a.downloadedAt || '1970-01-01T00:00:00Z').getTime()
                );

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
                            extractedPath:
                                status === 'completed' ? `${file.path}_extracted` : file.extractedPath,
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
            return await invoke('check_path_exists', { path: extractedDir });
        } catch (err) {
            console.error(`Error checking path ${extractedDir}:`, err);
            return false;
        }
    };

    const handleExtract = async (file: DownloadedFile) => {
        if (!file.path) {
            setError('File path is missing');
            return;
        }
        try {
            await invoke('unarchive_file', {
                filePath: file.path,
                outputDir: `${file.path}_extracted`,
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
            if (!path) throw new Error('Path is missing');
            const exists = await invoke('check_path_exists', { path });
            if (!exists) {
                setError(`Path "${path}" does not exist`);
                return;
            }
            const isDir = await invoke('is_directory', { path });
            await invoke(isDir ? 'open_directory' : 'open_file', { path });
        } catch (err) {
            console.error(`Failed to open path ${path}:`, err);
            setError(`Failed to open path: ${err}`);
        }
    };

    const handleSelectExecutable = async (gameId: string) => {
        try {
            const game = files.find((f) => f.id === gameId);
            if (!game || !game.extractedPath) {
                setError('Extract the game first');
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

    const totalPages = Math.ceil(files.length / itemsPerPage);
    const paginatedFiles = files.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-base-100">
            {/* Sidebar */}
            <div className="w-64 bg-base-200 p-4 hidden md:block sticky top-0 h-screen overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Registered Games</h2>
                <button
                    className="btn btn-outline btn-sm w-full mb-4"
                    onClick={() => setRefreshKey((prev) => prev + 1)}
                >
                    Refresh List
                </button>
                <div className="flex flex-col gap-1">
                    {files.map((file) => (
                        <button
                            key={file.id}
                            className="btn btn-ghost justify-start flex items-center gap-2 text-sm hover:bg-base-300 rounded-lg"
                            onClick={() => handleOpen(file.path)}
                        >
                            <img
                                src={convertFileSrc(file.iconPath || '/icon.webp')}
                                alt={`${file.filename} icon`}
                                className="w-6 h-6 rounded object-contain"
                                onError={(e) => (e.currentTarget.src = '/icon.webp')}
                            />
                            <span className="flex-1 text-left truncate">{file.filename}</span>
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

            {/* Main Content */}
            <div className="flex-1 p-6">
                <h1 className="text-3xl font-bold mb-6">Downloaded Games</h1>
                {error && (
                    <div className="alert alert-error mb-6 rounded-lg shadow-md">
                        <span>{error}</span>
                        <button
                            className="btn btn-sm btn-outline"
                            onClick={() => setRefreshKey((prev) => prev + 1)}
                        >
                            Try Again
                        </button>
                    </div>
                )}
                {files.length === 0 ? (
                    <div className="alert alert-info rounded-lg">
                        <span>No downloaded files found. Try downloading some games first.</span>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {paginatedFiles.map((file) => (
                                <GameCard
                                    key={file.id}
                                    file={file}
                                    handleExtract={handleExtract}
                                    handleOpen={handleOpen}
                                    handleLaunchGame={handleLaunchGame}
                                    handleChangeIcon={handleChangeIcon}
                                />
                            ))}
                        </div>
                        {totalPages > 1 && (
                            <div className="flex justify-center mt-8">
                                <div className="join">
                                    <button
                                        className="join-item btn btn-sm"
                                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                    >
                                        «
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                        <button
                                            key={page}
                                            className={`join-item btn btn-sm ${
                                                currentPage === page ? 'btn-active' : ''
                                            }`}
                                            onClick={() => setCurrentPage(page)}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                    <button
                                        className="join-item btn btn-sm"
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
                <LaunchModal
                    game={files.find((f) => f.id === launchModalOpen)}
                    launchModalOpen={launchModalOpen}
                    setLaunchModalOpen={setLaunchModalOpen}
                    selectedExecutable={selectedExecutable}
                    setSelectedExecutable={setSelectedExecutable}
                    launchMethod={launchMethod}
                    setLaunchMethod={setLaunchMethod}
                    customCommand={customCommand}
                    setCustomCommand={setCustomCommand}
                    handleSelectExecutable={handleSelectExecutable}
                    saveLaunchConfig={saveLaunchConfig}
                    handleExtract={handleExtract}
                />
            </div>
        </div>
    );
};

export default Games;