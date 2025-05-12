import { invoke } from "@tauri-apps/api/core";

const AUTH_TOKEN = "d7fc12050f11a0b6a069ec2b40570e83fca767d76a72a05e5bb3c0378fab2355";

// Check if running in a Tauri environment
export function isTauriAvailable(): boolean {
    return (
        typeof window !== "undefined" &&
        window !== null &&
        typeof window.__TAURI_IPC__ === "function"
    );
}

// Generic fetch function that will use Tauri when available or fallback to browser fetch
export async function fetchData<T>(url: string, payload: any): Promise<T> {
    if (isTauriAvailable()) {
        try {
            // Use Tauri invoke with authentication
            return await invoke<T>("fetch_data", {
                url,
                payload: JSON.stringify(payload),
                authToken: AUTH_TOKEN, // ส่ง token ไปยัง backend Tauri
            });
        } catch (error) {
            console.warn("Tauri invoke failed, falling back to fetch API:", error);
            // Fall through to fetch API
        }
    }

    // Fallback to browser fetch API with authentication
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${AUTH_TOKEN}`, // เพิ่ม header Authorization
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
}