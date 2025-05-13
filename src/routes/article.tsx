import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchArticleBySlug, fetchArticleDownloads } from "./api";
import ArticleDetailModal from "./download/ArticleDetailModal.tsx";
import { ArticleDownload } from "./components/articles/types/types.ts"; // Import shared interface

// Interfaces
interface ArticleDetail {
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

interface TranslationFile {
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

const ArticlePage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();

    const [articleDetail, setArticleDetail] = useState<ArticleDetail | null>(null);
    const [articleDownloads, setArticleDownloads] = useState<ArticleDownload[]>([]);
    const [translationFiles, setTranslationFiles] = useState<TranslationFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchArticleDetails = async () => {
            if (!slug) return;

            setLoading(true);
            try {
                const article = await fetchArticleBySlug(slug);
                setArticleDetail(article);

                const downloadsResponse = await fetchArticleDownloads(article.id);
                setArticleDownloads(downloadsResponse || []);

                // Fetch translation files
                const translationResponse = await fetch(
                    `https://api.chanomhub.online/api/translation-files/article/${slug}`
                );
                const translationData = await translationResponse.json();
                setTranslationFiles(translationData.translationFiles || []);
            } catch (err) {
                console.error("Error fetching article details:", err);
                setError("ไม่สามารถโหลดข้อมูลบทความได้");
                setTranslationFiles([]); // Ensure translationFiles is an empty array on error
            } finally {
                setLoading(false);
            }
        };

        fetchArticleDetails();
    }, [slug]);

    const handleClose = () => {
        navigate('/');
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
                <div className="flex flex-col items-center">
                    <span className="loading loading-spinner loading-lg"></span>
                    <p className="mt-4 text-base-content/70">กำลังโหลดข้อมูล...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
                <div className="text-center">
                    <h2 className="text-2xl font-semibold text-error">เกิดข้อผิดพลาด</h2>
                    <p className="mt-2">{error}</p>
                    <button
                        className="btn btn-primary mt-6"
                        onClick={() => navigate('/')}
                    >
                        กลับสู่หน้าหลัก
                    </button>
                </div>
            </div>
        );
    }

    if (!articleDetail) {
        return (
            <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
                <div className="text-center">
                    <h2 className="text-2xl font-semibold">ไม่พบบทความ</h2>
                    <p className="mt-2">ไม่พบบทความที่คุณกำลังค้นหา</p>
                    <button
                        className="btn btn-primary mt-6"
                        onClick={() => navigate('/')}
                    >
                        กลับสู่หน้าหลัก
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <ArticleDetailModal
                articleDetail={articleDetail}
                articleDownloads={articleDownloads}
                translationFiles={translationFiles}
                loadingDetail={false}
                onClose={handleClose}
            />
        </div>
    );
};

export default ArticlePage;
