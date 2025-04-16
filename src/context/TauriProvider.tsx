import React, { useState, useEffect, useContext, ReactNode } from "react";
import * as tauriPath from "@tauri-apps/api/path";
import tauriConfJson from "../../src-tauri/tauri.conf.json" with { type: "json" };
import * as fs from '@tauri-apps/plugin-fs';
import * as os from "@tauri-apps/plugin-os";

export const APP_NAME = tauriConfJson.productName;
export const RUNNING_IN_TAURI = (window as any).__TAURI__ !== undefined;

interface TauriContextInterface {
    loading: boolean;
    downloads: string | undefined;
    documents: string | undefined;
    appDocuments: string | undefined;
    osType: string | undefined;
    fileSep: string;
}

const TauriContext = React.createContext<TauriContextInterface | undefined>(undefined);

export const useTauriContext = () => useContext(TauriContext);

export function TauriProvider({ children }: { children: ReactNode }) {
    const [loading, setLoading] = useState<boolean>(true);
    const [downloads, setDownloadDir] = useState<string | undefined>(undefined);
    const [documents, setDocumentDir] = useState<string | undefined>(undefined);
    const [osType, setOsType] = useState<string | undefined>(undefined);
    const [fileSep, setFileSep] = useState<string>("/");
    const [appDocuments, setAppDocuments] = useState<string | undefined>(undefined);

    // Define the OsType explicitly if not provided by the plugin
    type CustomOsType = "Linux" | "Darwin" | "Windows_NT";

    const getFileSeparator = (osType: CustomOsType): string => {
        return osType === "Windows_NT" ? "\\" : "/";
    };

    useEffect(() => {
        if (RUNNING_IN_TAURI) {
            const callTauriAPIs = async () => {
                try {
                    const downloadPath = await tauriPath.downloadDir();
                    setDownloadDir(downloadPath);

                    const docPath = await tauriPath.documentDir();
                    setDocumentDir(docPath);

                    const osTypeResult = await os.type() as CustomOsType;
                    setOsType(osTypeResult);

                    const separator = getFileSeparator(osTypeResult);
                    setFileSep(separator);

                    await fs.mkdir(`${docPath}${APP_NAME}`, {
                        baseDir: fs.BaseDirectory.Document,
                        recursive: true,
                    });

                    setAppDocuments(`${docPath}${APP_NAME}`);
                    setLoading(false);
                } catch (error) {
                    console.error("Tauri API call failed:", error);
                }
            };
            callTauriAPIs();
        }
    }, []);

    return (
        <TauriContext.Provider
            value={{ loading, fileSep, downloads, documents, osType, appDocuments }}
        >
            {children}
        </TauriContext.Provider>
    );
}