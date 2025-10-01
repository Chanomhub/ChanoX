// platformApi.ts
import axios from "axios";
import { Platform } from "./types";

const API_URL = "https://api.chanomhub.online/api/platforms";

interface PlatformsResponse {
    platforms: string[];
}

export const fetchPlatforms = async (): Promise<Platform[]> => {
    try {
        const response = await axios.get<PlatformsResponse>(API_URL);
        return response.data.platforms;
    } catch (error) {
        console.error("Error fetching platforms:", error);
        return [];
    }
};