
export interface ArticleFormData {
    title: string;
    description: string;
    body: string;
    tagList: string;
    categoryList: string;
    platformList: string;
    status: 'DRAFT' | 'PUBLISHED';
    engine?: 'RENPY' | 'RPGM' | 'UNITY' | 'UNREAL' | '';
    mainImage: string;
    images: string;
    mainImageFile?: string;
    additionalImageFiles: string[];
    version?: string;
}

export interface DownloadData {
    downloadName: string;
    downloadUrl: string;
    isActive: boolean;
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
        version?: bigint;
    };
}