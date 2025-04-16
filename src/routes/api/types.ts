// types.ts
// Common interfaces
export interface Author {
    id: number;
    name: string;
    image: string;
}

export interface Tag {
    id: number;
    name: string;
    articleCount?: number;
}

export interface Platform {
    id: number;
    name: string;
    articleCount?: number;
}

export interface Category {
    id: number;
    name: string;
    articleCount?: number;
}

export interface Game {
    id: number;
    title: string;
    description: string;
    slug: string;
    mainImage: string;
    tags: Tag[];
    platforms: Platform[];
    categories: Category[];
    author: Author;
    createdAt: number;
    updatedAt?: number;
}

// API Response interfaces
export interface SearchResponse<T> {
    hits: T[];
    offset?: number;
    limit?: number;
    estimatedTotalHits?: number;
    processingTimeMs?: number;
    query?: string;
}

// Type guard function to check if response is valid
export function isValidResponse<T>(response: any): response is SearchResponse<T> {
    return response && Array.isArray(response.hits);
}