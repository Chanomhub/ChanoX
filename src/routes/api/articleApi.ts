// articleApi.ts
import { invoke } from "@tauri-apps/api/core";
import { Article, MultipleArticlesResponse, ArticleSummary } from "./types";

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

        const articleSummaries: ArticleSummary[] = articles.map(article => ({
            id: article.id,
            title: article.title,
            slug: article.slug,
            description: article.description,
            author: article.author,
            categoryList: article.categoryList,
            platformList: article.platformList,
            tagList: article.tagList,
            mainImage: article.mainImage ?? undefined,
            createdAt: article.createdAt,
        }));

        return { articles: articleSummaries, articlesCount: articles.length };
    } catch (error) {
        console.error("Error fetching articles:", error);
        return { articles: [], articlesCount: 0 };
    }
};