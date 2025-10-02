// types.ts
// Common interfaces
export interface Profile {
    username: string;
    bio: string | null;
    image: string | null;
    backgroundImage: string | null;
    following: boolean;
    socialMediaLinks: SocialMediaLinkDTO[];
}

export interface Author extends Profile {
    id: number;
}

export type Tag = string;

export type Platform = string;

export type Category = string;

export interface Article {
    id: number;
    title: string;
    slug: string;
    description: string;
    body: string;
    ver: string | null; // Assuming 'object' in API doc means it can be string or null
    version?: number; // Optional as it might not always be present
    createdAt: string; // Changed from number to string
    updatedAt: string; // Changed from number to string
    status: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "ARCHIVED" | "NOT_APPROVED" | "NEEDS_REVISION";
    engine?: string; // Optional
    mainImage: string | null; // Assuming 'object' in API doc means string or null
    images: string[];
    backgroundImage: string | null;
    coverImage: string | null;
    tagList: string[]; // Changed from Tag[]
    categoryList: string[]; // Changed from Category[]
    platformList: string[]; // Changed from Platform[]
    author: Author; // Using the extended Author interface
    favorited: boolean;
    favoritesCount: number;
    sequentialCode: string | null; // Assuming 'object' in API doc means string or null
}

export interface ArticleSummary {
    id: number;
    title: string;
    slug: string;
    description: string;
    author: string | Profile; // Changed to be more flexible
    categoryList: string[];
    platformList: string[];
    tagList: string[];
    mainImage?: string; // Optional, as it might not always be present in summary
    createdAt?: string; // Optional, as it might not always be present in summary
}

// API Response interfaces
export interface MultipleArticlesResponse {
    articles: ArticleSummary[];
    articlesCount: number;
}

export interface SocialMediaLinkDTO {
    platform: string;
    url: string;
}

// Removed SearchResponse and isValidResponse as they are no longer directly used with the new API structure