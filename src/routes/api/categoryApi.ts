// categoryApi.ts
import { Category, SearchResponse, isValidResponse } from "./types";
import { fetchData } from "./utils";

const API_URL = "https://search.chanomhub.online/indexes/category/search";

export async function fetchCategories(): Promise<Category[]> {
    try {
        const payload = {
            limit: 100,
            sort: ["articleCount:desc"]
        };

        const response = await fetchData<SearchResponse<Category>>(API_URL, payload);

        if (isValidResponse<Category>(response)) {
            return response.hits;
        }

        console.error("Invalid category response format:", response);
        return [];
    } catch (error) {
        console.error("Error fetching categories:", error);
        return [];
    }
}