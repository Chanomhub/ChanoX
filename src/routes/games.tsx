import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { convertFileSrc } from '@tauri-apps/api/core';
import { DownloadedFile, SavedGameInfo, LaunchConfig } from './types/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RefreshCw, FolderOpen, Play, AlertCircle, Info, ImageIcon } from 'lucide-react';

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
        <Card className="hover:shadow-lg transition-all duration-300 overflow-hidden">
            <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg bg-secondary/10 p-1 flex items-center justify-center">
                        <img
                            src={getIconUrl(file.iconPath)}
                            alt={`${file.filename} icon`}
                            className="w-full h-full rounded object-contain"
                            onError={(e) => (e.currentTarget.src = '/icon.webp')}
                        />
                    </div>
                    <h3 className="font-semibold text-lg truncate flex-1">{file.filename}</h3>
                </div>
                <div className="space-y-1 mb-4">
                    <p className="text-sm text-muted-foreground">
                        Status: {file.extracted ? 'Extracted' : 'Not Extracted'}
                    </p>
                    <p className="text-sm text-muted-foreground truncate" title={file.path}>
                        Path: {file.path || 'Not available'}
                    </p>
                </div>
                <div className="flex flex-col gap-2">
                    {!file.extracted && isExtractable(file.filename) && file.path && (
                        file.extractionStatus === 'extracting' ? (
                            <div className="space-y-2">
                                <p className="text-sm text-blue-600 dark:text-blue-400">Extracting...</p>
                                <Progress value={file.extractionProgress || 0} className="h-2" />
                                <p className="text-sm text-center text-muted-foreground">
                                    {(file.extractionProgress || 0).toFixed(1)}%
                                </p>
                            </div>
                        ) : file.extractionStatus === 'failed' ? (
                            <div className="space-y-2">
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription className="text-sm">
                                        Extraction failed: {file.error}
                                    </AlertDescription>
                                </Alert>
                                <Button
                                    className="w-full"
                                    onClick={() => handleExtract(file)}
                                >
                                    Retry Extraction
                                </Button>
                            </div>
                        ) : (
                            <Button
                                className="w-full"
                                onClick={() => handleExtract(file)}
                            >
                                Extract File
                            </Button>
                        )
                    )}
                    {file.extracted && file.extractedPath && (
                        <>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => handleOpen(file.path!)}
                                >
                                    <FolderOpen className="w-4 h-4 mr-1" />
                                    Archive
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => handleOpen(file.extractedPath!)}
                                >
                                    <FolderOpen className="w-4 h-4 mr-1" />
                                    Extracted
                                </Button>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => handleChangeIcon(file.id)}
                            >
                                <ImageIcon className="w-4 h-4 mr-2" />
                                Change Icon
                            </Button>
                            <Button
                                className="w-full"
                                onClick={() => handleLaunchGame(file)}
                            >
                                <Play className="w-4 h-4 mr-2" />
                                {file.launchConfig ? 'Launch Game' : 'Configure Launch'}
                            </Button>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
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
    if (!game) return null;

    const getIconUrl = (iconPath?: string): string =>
        iconPath ? convertFileSrc(iconPath) : '/icon.webp';

    const isGameExtracted = game.extracted && game.extractedPath;
    const isExtracting = game.extractionStatus === 'extracting';

    return (
        <Dialog open={!!launchModalOpen} onOpenChange={(open) => !open && setLaunchModalOpen(null)}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-lg bg-secondary/10 p-1">
                            <img
                                src={getIconUrl(game.iconPath)}
                                alt={`${game.filename} icon`}
                                className="w-full h-full rounded object-contain"
                                onError={(e) => (e.currentTarget.src = '/icon.webp')}
                            />
                        </div>
                        <div className="flex-1">
                            <DialogTitle>{game.filename}</DialogTitle>
                            <p className="text-sm text-muted-foreground">Configure launch settings</p>
                        </div>
                    </div>
                </DialogHeader>

                {isExtracting ? (
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            <div className="space-y-2">
                                <h4 className="font-semibold">Extraction in Progress</h4>
                                <p className="text-sm">Please wait until the extraction is complete.</p>
                                <Progress value={game.extractionProgress || 0} className="h-2" />
                                <p className="text-sm text-center">{(game.extractionProgress || 0).toFixed(1)}%</p>
                            </div>
                        </AlertDescription>
                    </Alert>
                ) : !isGameExtracted ? (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            <div className="space-y-2">
                                <h4 className="font-semibold">Extract Required</h4>
                                <p className="text-sm">Please extract the game files first.</p>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                        setLaunchModalOpen(null);
                                        if (game.path) handleExtract(game);
                                    }}
                                >
                                    Extract Now
                                </Button>
                            </div>
                        </AlertDescription>
                    </Alert>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Executable File</Label>
                            {game.extractedPath && (
                                <p className="text-xs text-muted-foreground">
                                    From: {game.extractedPath}
                                </p>
                            )}
                            <div className="flex gap-2">
                                <Input
                                    value={selectedExecutable}
                                    readOnly
                                    placeholder="Select an executable file"
                                    className="flex-1"
                                />
                                <Button
                                    onClick={() => handleSelectExecutable(launchModalOpen!)}
                                >
                                    Browse
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Launch Method</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {(['direct', 'python', 'wine', 'custom'] as const).map((method) => (
                                    <button
                                        key={method}
                                        className={`border rounded-lg p-3 transition-all hover:bg-accent ${
                                            launchMethod === method
                                                ? 'border-primary bg-accent ring-2 ring-primary'
                                                : 'border-input'
                                        }`}
                                        onClick={() => setLaunchMethod(method)}
                                    >
                                        <div className="text-center text-sm capitalize">{method}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {launchMethod === 'custom' && (
                            <div className="space-y-2">
                                <Label>Custom Command</Label>
                                <Textarea
                                    value={customCommand}
                                    onChange={(e) => setCustomCommand(e.target.value)}
                                    placeholder="Enter custom launch command"
                                    className="h-20"
                                />
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setLaunchModalOpen(null)}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => saveLaunchConfig(launchModalOpen!)}
                        disabled={
                            isExtracting ||
                            !isGameExtracted ||
                            !selectedExecutable ||
                            (launchMethod === 'custom' && !customCommand)
                        }
                    >
                        Save Configuration
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
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
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-background">
            {/* Sidebar */}
            <div className="w-64 border-r bg-card p-4 hidden md:block sticky top-0 h-screen">
                <h2 className="text-xl font-bold mb-4">Registered Games</h2>
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full mb-4"
                    onClick={() => setRefreshKey((prev) => prev + 1)}
                >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh List
                </Button>
                <ScrollArea className="h-[calc(100vh-8rem)]">
                    <div className="flex flex-col gap-1">
                        {files.map((file) => (
                            <Button
                                key={file.id}
                                variant="ghost"
                                className="justify-start gap-2 h-auto py-2 px-3"
                                onClick={() => handleOpen(file.path)}
                            >
                                <img
                                    src={convertFileSrc(file.iconPath || '/icon.webp')}
                                    alt={`${file.filename} icon`}
                                    className="w-6 h-6 rounded object-contain"
                                    onError={(e) => (e.currentTarget.src = '/icon.webp')}
                                />
                                <span className="flex-1 text-left truncate text-sm">{file.filename}</span>
                                {file.extractionStatus === 'extracting' && (
                                    <span className="text-xs text-blue-600">Extracting...</span>
                                )}
                                {file.extractionStatus === 'failed' && (
                                    <span className="text-xs text-red-600">Failed</span>
                                )}
                            </Button>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6">
                <h1 className="text-3xl font-bold mb-6">Downloaded Games</h1>
                {error && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="flex items-center justify-between">
                            <span>{error}</span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setRefreshKey((prev) => prev + 1)}
                            >
                                Try Again
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}
                {files.length === 0 ? (
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            No downloaded files found. Try downloading some games first.
                        </AlertDescription>
                    </Alert>
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
                            <div className="flex justify-center mt-8 gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                >
                                    Previous
                                </Button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <Button
                                        key={page}
                                        variant={currentPage === page ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setCurrentPage(page)}
                                    >
                                        {page}
                                    </Button>
                                ))}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                </Button>
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