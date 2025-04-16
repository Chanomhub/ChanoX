// articleApi.ts
import { Game, SearchResponse, isValidResponse } from "./types";
import { fetchData } from "./utils";

const API_URL = "https://search.chanomhub.online/indexes/article/search";

interface ArticleSearchParams {
    limit?: number;
    offset?: number;
    query?: string;
    categories?: string[] | number[] | null;
    platforms?: string[] | number[] | null;
    tags?: string[] | number[] | null;
    sort?: string[];
    useHybridSearch?: boolean;
}

export async function fetchArticles({
                                        limit = 20,
                                        offset = 0,
                                        query = "",
                                        categories = null,
                                        platforms = null,
                                        tags = null,
                                        sort = ["updatedAt:desc"],
                                        useHybridSearch = false
                                    }: ArticleSearchParams = {}): Promise<Game[]> {
    try {
        const payload: any = {
            limit,
            offset,
            sort
        };

        // Use q="*" when there's no search query or use the user's query
        payload.q = query && query.trim() !== "" ? query : "*";

        // Create filters array for Meilisearch
        const filters: string[] = [];

        if (categories && categories.length > 0) {
            // Use the correct ID format
            filters.push(`categories.id IN [${categories.map(cat => `"${cat}"`).join(', ')}]`);
        }

        if (platforms && platforms.length > 0) {
            filters.push(`platforms.id IN [${platforms.map(platform => `"${platform}"`).join(', ')}]`);
        }

        if (tags && tags.length > 0) {
            filters.push(`tags.id IN [${tags.map(tag => `"${tag}"`).join(', ')}]`);
        }

        if (filters.length > 0) {
            payload.filter = filters;
        }

        // Add hybrid search parameters if enabled
        if (useHybridSearch && query && query.trim() !== "") {
            payload.hybrid = {
                semanticRatio: 0.5,
                embedder: "default"
            };
        }

        const response = await fetchData<SearchResponse<Game>>(API_URL, payload);

        if (isValidResponse<Game>(response)) {
            return response.hits;
        }

        console.error("Invalid article response format:", response);
        return [];
    } catch (error) {
        console.error("Error fetching articles:", error);
        return [];
    }
}