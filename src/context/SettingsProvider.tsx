import { createContext, useContext, ReactNode } from "react";

interface SettingsContextInterface {
    // Placeholder for future settings
}

export const SettingsContext = createContext<SettingsContextInterface>({});

export const useSettingsContext = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    return (
        <SettingsContext.Provider value={{}}>
            {children}
        </SettingsContext.Provider>
    );
};
