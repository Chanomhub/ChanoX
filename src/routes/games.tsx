import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface DownloadedFile {
    id: string;
    filename: string;
    path: string;
    status: string;
    extracted: boolean;
    extractedPath?: string;
    createdAt: string;
}

// สร้าง interface ที่สอดคล้องกับ DownloadedGameInfo ใน Rust
interface SavedGameInfo {
    id: string;
    filename: string;
    path: string;
    extracted: boolean;
    extracted_path?: string;
    created_at: string;
}

const Games: React.FC = () => {
    const [files, setFiles] = useState<DownloadedFile[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const itemsPerPage = 9; // 3x3 grid

    // Helper function to extract just the filename from a path
    const getFilenameFromPath = (path: string): string => {
        // Split by both forward and backward slashes to handle different OS paths
        const parts = path.split(/[\/\\]/);
        return parts[parts.length - 1];
    };

    // Fetch downloaded files
    useEffect(() => {
        const fetchDownloadedFiles = async () => {
            try {
                setLoading(true);

                // First, get active downloads from the download manager
                const activeDownloads: DownloadedFile[] = await invoke('get_active_downloads');
                const completedFiles = activeDownloads.filter((file) => file.status === 'completed');

                // Then, get saved games from config
                const savedGames: SavedGameInfo[] = await invoke('get_saved_games');

                // Process completed files from active downloads
                const processedActiveFiles = await Promise.all(
                    completedFiles.map(async (file) => {
                        if (file.path) {
                            const extracted = await checkIfExtracted(file.path);
                            return {
                                ...file,
                                extracted,
                                extractedPath: extracted ? `${file.path}_extracted` : undefined
                            };
                        }
                        return { ...file, extracted: false };
                    })
                );

                // Convert saved games to match DownloadedFile format
                const processedSavedGames = savedGames.map(game => ({
                    id: game.id,
                    filename: game.filename,
                    path: game.path,
                    status: 'completed',
                    extracted: game.extracted,
                    extractedPath: game.extracted_path,
                    createdAt: game.created_at
                }));

                // Merge active downloads with saved games, removing duplicates by ID
                const allFilesMap = new Map();

                [...processedActiveFiles, ...processedSavedGames].forEach(file => {
                    allFilesMap.set(file.id, file);
                });

                const mergedFiles = Array.from(allFilesMap.values());
                mergedFiles.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                setFiles(mergedFiles);
            } catch (err) {
                console.error("Error fetching downloads:", err);
                setError('Failed to fetch downloaded files');
            } finally {
                setLoading(false);
            }
        };

        fetchDownloadedFiles();
    }, [refreshKey]);

    // Save to config when files change
    useEffect(() => {
        const saveGamesToConfig = async () => {
            if (files.length === 0) return;

            try {
                // Convert to SavedGameInfo format
                const gamesToSave = files.map(file => ({
                    id: file.id,
                    filename: file.filename,
                    path: file.path,
                    extracted: file.extracted,
                    extracted_path: file.extractedPath
                }));

                await invoke('save_games', { games: gamesToSave });
                console.log('Games saved to config successfully');
            } catch (err) {
                console.error('Error saving games to config:', err);
                // Don't show error to user as this is just a background save
            }
        };

        saveGamesToConfig();
    }, [files]);

    const checkIfExtracted = async (path: string): Promise<boolean> => {
        if (!path) return false;
        const extractedDir = `${path}_extracted`;
        try {
            // Removed unnecessary "as boolean" type assertion
            const exists = await invoke('check_path_exists', { path: extractedDir });
            return !!exists; // Double negation ensures we return a boolean
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
            await invoke('unarchive_file', { filePath: file.path, outputDir });

            setFiles((prev) =>
                prev.map((f) =>
                    f.id === file.id ? { ...f, extracted: true, extractedPath: outputDir } : f
                )
            );

            await invoke('show_download_notification', {
                title: 'Extraction Complete',
                message: `File ${file.filename} has been extracted to ${outputDir}`,
            });

            setRefreshKey(prev => prev + 1);
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
            // Also remove unnecessary type assertion here if SonarQube flags it
            const exists = await invoke('check_path_exists', { path });
            if (!exists) {
                throw new Error('Path does not exist');
            }
            // ตรวจสอบว่าเป็นโฟลเดอร์หรือไฟล์
            const isDir = await invoke('is_directory', { path });
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

    const renderFileContent = (file: DownloadedFile) => {
        if (!file.path) {
            return <p className="text-sm text-warning">File path missing</p>;
        }

        if (!isExtractable(file.filename)) {
            return <p className="text-sm text-warning">File format not supported for extraction</p>;
        }

        if (!file.extracted || !file.extractedPath) {
            return (
                <button
                    className="btn btn-primary"
                    onClick={() => handleExtract(file)}
                >
                    Extract File
                </button>
            );
        }

        return (
            <div className="flex flex-col gap-2">
                <button className="btn btn-secondary" onClick={() => handleOpen(file.extractedPath!)}>
                    Open Extracted Folder
                </button>
                <p className="text-sm">Extracted to: {getFilenameFromPath(file.extractedPath)}</p>
            </div>
        );
    };

    // Pagination logic
    const totalPages = Math.ceil(files.length / itemsPerPage);
    const paginatedFiles = files.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen">
            {/* Sidebar */}
            <div className="w-64 bg-base-200 p-4">
                <h2 className="text-xl font-bold mb-4">Registered Games</h2>
                <button
                    className="btn btn-outline w-full mb-4"
                    onClick={() => setRefreshKey(prev => prev + 1)}
                >
                    Refresh List
                </button>
                <div className="flex flex-col gap-2">
                    {files.map((file) => (
                        <button
                            key={file.id}
                            className="btn btn-ghost justify-start"
                            onClick={() => handleOpen(file.path)}
                        >
                            {getFilenameFromPath(file.filename)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
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
                            <button className="btn btn-sm" onClick={() => setRefreshKey(prev => prev + 1)}>
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
                                        <h2 className="card-title">{getFilenameFromPath(file.filename)}</h2>
                                        <p>Status: {file.extracted ? 'Extracted' : 'Not Extracted'}</p>
                                        <p className="text-sm truncate">Path: {file.path || 'Not available'}</p>
                                        <div className="card-actions justify-between">
                                            {file.path && (
                                                <button
                                                    className="btn btn-outline"
                                                    onClick={() => handleOpen(file.path)}
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

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center mt-6">
                                <div className="join">
                                    <button
                                        className="join-item btn"
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                    >
                                        »
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Games;