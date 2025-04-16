export {};
declare global {
    interface Window {
        __TAURI_IPC__?: () => void;
    }
}