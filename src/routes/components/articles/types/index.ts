// src/routes/components/articles/types/index.ts
export interface ArticleFormData {
    title: string;
    description: string;
    body: string;
    tagList: string;
    categoryList: string;
    platformList: string;
    status: 'DRAFT' | 'PUBLISHED';
    engine?: 'RENPY' | 'RPGM' | 'UNITY' | 'UNREAL' | '' | undefined;
    mainImage: string;
    images: string;
    mainImageFile?: string;
    additionalImageFiles: string[];
    version?: string;
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