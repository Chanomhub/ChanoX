// tagApi.ts
import { Tag, SearchResponse, isValidResponse } from "./types";
import { fetchData } from "./utils";

const API_URL = "https://search.chanomhub.online/indexes/tag/search";

export async function fetchTags(): Promise<Tag[]> {
    try {
        const payload = {
            limit: 100,
            sort: ["articleCount:desc"]
        };

        const response = await fetchData<SearchResponse<Tag>>(API_URL, payload);

        if (isValidResponse<Tag>(response)) {
            return response.hits;
        }

        console.error("Invalid tag response format:", response);
        return [];
    } catch (error) {
        console.error("Error fetching tags:", error);
        return [];
    }
}