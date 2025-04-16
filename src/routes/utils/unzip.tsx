// utils/unzip.ts
import { invoke } from '@tauri-apps/api/core';

export async function unzip(filePath: string, outputDir: string): Promise<void> {
    try {
        await invoke('unzip_file', { filePath, outputDir });
    } catch (err) {
        throw new Error(`Failed to unzip file: ${err}`);
    }
}