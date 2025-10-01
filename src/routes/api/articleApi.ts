// articleApi.ts
import { invoke } from "@tauri-apps/api/core";
import { Article, MultipleArticlesResponse } from "./types";

const API_URL = "https://api.chanomhub.online/api/articles";

interface FetchArticlesParams {
    limit?: number;
    offset?: number;
    query?: string;
    categories?: string[] | null;
    platforms?: string[] | null;
    tags?: string[] | null;
    sort?: string[];
}

export const fetchArticles = async (
    params: FetchArticlesParams = {}
): Promise<MultipleArticlesResponse> => {
    try {
        const token = await invoke<string | null>("get_token");
        const articles = await invoke<Article[]>("get_articles", {
            token,
            limit: params.limit,
            offset: params.offset,
            query: params.query,
            categories: params.categories?.join(","),
            platforms: params.platforms?.join(","),
            tags: params.tags?.join(","),
            sort: params.sort?.join(","),
        });
        return { articles, articlesCount: articles.length };
    } catch (error) {
        console.error("Error fetching articles:", error);
        return { articles: [], articlesCount: 0 };
    }
};