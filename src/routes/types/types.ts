export interface DownloadItem {
    id: string;
    filename: string;
    url: string;
    progress: number;
    status: "pending" | "downloading" | "completed" | "failed" | "cancelled";
    path?: string;
    error?: string;
    provider?: string;
}


export interface LaunchConfig {
    executablePath: string;
    launchMethod: 'direct' | 'python' | 'wine' | 'custom';
    customCommand?: string;
}

export interface DownloadedFile {
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

export interface SavedGameInfo {
    id: string;
    filename: string;
    path: string;
    extracted: boolean;
    extracted_path?: string;
    downloadedAt: string;
    launch_config?: LaunchConfig;
    icon_path?: string;
}



export interface PluginManifest {
    id: string;
    name: string;
    version: string;
    supported_hosts: string[];
    entry_point: string;
    type: 'script' | 'command';
    plugin_function: 'download' | 'translate' | 'emulation' | string;
    external_binary?: boolean;
    language?: string;
    successful?: string;
    install_instruction?: string;
    supported_actions: string[];
    category?: string; // Add this line
}



export interface SocialMediaLink {
    platform: string;
    url: string;
}

export interface ProfileData {
    username: string;
    bio: string;
    image: string;
    backgroundImage: string;
    following: boolean;
    socialMediaLinks: SocialMediaLink[];
}



export interface CloudinaryConfig {
    cloud_name: string;
    api_key: string;
    api_secret: string;
}