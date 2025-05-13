export interface ArticleFormData {
    title: string;
    description: string;
    body: string;
    tagList: string;
    categoryList: string;
    platformList: string;
    status: string;
    engine: string;
    mainImage: string;
    images: string;
    additionalImageFiles: string[];
    mainImageFile?: string;
    version: string;
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
        engine: string;
        version: number;
    };
}

export interface DownloadData {
    downloadName: string;
    downloadUrl: string;
    isActive: boolean;
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