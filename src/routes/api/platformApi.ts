// platformApi.ts
import { Platform, SearchResponse, isValidResponse } from "./types";
import { fetchData } from "./utils";

const API_URL = "https://search.chanomhub.online/indexes/platform/search";

export async function fetchPlatforms(): Promise<Platform[]> {
    try {
        const payload = {
            limit: 100,
            sort: ["articleCount:desc"]
        };

        const response = await fetchData<SearchResponse<Platform>>(API_URL, payload);

        if (isValidResponse<Platform>(response)) {
            return response.hits;
        }

        console.error("Invalid platform response format:", response);
        return [];
    } catch (error) {
        console.error("Error fetching platforms:", error);
        return [];
    }
}