// src/routes/components/articles/types.ts

export interface ArticleFormData {
    title: string;
    description: string;
    body: string;
    tagList: string;
    categoryList: string;
    platformList: string;
    status: 'DRAFT' | 'PUBLISHED';
    engine?: 'RENPY' | 'RPGM' | 'UNITY' | 'UNREAL' | 'Godot' | '';
    mainImage: string;
    images: string;
    mainImageFile?: string;
    additionalImageFiles: string[];
    ver?: string;
    version?: string; // รองรับทั้ง `ver` และ `version`
}

export interface ArticlePayload {
    article: {
        title: string;
        description: string;
        body: string;
        tagList: string[];
        categoryList: string[];
        platformList: string[];
        status: string;
        mainImage: string;
        images: string[];
        engine?: string;
        ver?: string;
    };
}

export interface ArticleDownload {
    id: number;
    articleId: number;
    name: string;
    url: string;
    isActive: boolean;
    status: string;
    createdAt: string;
    updatedAt: string;
}

export interface DownloadData {
    downloadName: string;
    downloadUrl: string;
    isActive: boolean;
}

export interface TranslationFile {
    id: number;
    articleId: number;
    translatorId: number;
    name: string;
    description: string;
    language: string;
    creditTo: string;
    fileUrl: string;
    version: string;
    articleVersion: number;
    status: string;
    createdAt: string;
    updatedAt: string;
    translator: {
        id: number;
        name: string;
        image: string;
    };
    images: string[];
}

export interface ArticleDetail {
    id: number;
    title: string;
    slug: string;
    description: string;
    body: string;
    version: number;
    createdAt: string;
    updatedAt: string;
    status: string;
    mainImage: string;
    images: string[];
    tagList: string[];
    categoryList: string[];
    platformList: string[];
    author: {
        username: string;
        bio: string;
        image: string;
        following: boolean;
    };
    favorited: boolean;
    favoritesCount: number;
}
