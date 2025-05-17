import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchArticleBySlug } from "./api";
import { ArticleDetailModal } from "./components/articles/ArticleDetailModal.tsx";
import { ArticleDetail, ArticleDownload, TranslationFile } from "./components/articles/types/types.ts";

const ArticlePage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();

    const [articleDetail, setArticleDetail] = useState<ArticleDetail | null>(null);
    const [articleDownloads, setArticleDownloads] = useState<ArticleDownload[]>([]);
    const [translationFiles, setTranslationFiles] = useState<TranslationFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!slug) {
                setError("ไม่พบ slug ใน URL");
                setLoading(false);
                return;
            }

            try {
                // Fetch article details
                const article = await fetchArticleBySlug(slug);
                setArticleDetail(article);

                // Fetch downloads
                const downloadsResponse = await fetch(`https://api.chanomhub.online/api/downloads/article/${article.id}`);
                if (!downloadsResponse.ok) throw new Error(`Downloads API failed: ${downloadsResponse.status}`);
                const downloadsData = await downloadsResponse.json();
                // Extract links array, ensure it's an array
                const downloadsArray = Array.isArray(downloadsData.links) ? downloadsData.links : [];
                setArticleDownloads(downloadsArray);

                // Fetch translations
                const translationResponse = await fetch(`https://api.chanomhub.online/api/translation-files/article/${slug}`);
                if (!translationResponse.ok) throw new Error(`Translation API failed: ${translationResponse.status}`);
                const translationData = await translationResponse.json();
                setTranslationFiles(Array.isArray(translationData.translationFiles) ? translationData.translationFiles : []);
            } catch (err: any) {
                setError(err.message || "ไม่สามารถโหลดข้อมูลบทความได้");
                setArticleDownloads([]);
                setTranslationFiles([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [slug]);

    return (
        <div className="container mx-auto px-4 py-8">
            {loading ? (
                <div className="flex justify-center items-center min-h-[50vh]">
                    <span className="loading loading-spinner loading-lg"></span>
                    <p className="mt-4">กำลังโหลดข้อมูล...</p>
                </div>
            ) : error ? (
                <div className="text-center">
                    <h2 className="text-2xl font-semibold text-error">เกิดข้อผิดพลาด</h2>
                    <p className="mt-2">{error}</p>
                    <button className="btn btn-primary mt-6" onClick={() => navigate("/")}>
                        กลับสู่หน้าหลัก
                    </button>
                </div>
            ) : !articleDetail ? (
                <div className="text-center">
                    <h2 className="text-2xl font-semibold">ไม่พบบทความ</h2>
                    <button className="btn btn-primary mt-6" onClick={() => navigate("/")}>
                        กลับสู่หน้าหลัก
                    </button>
                </div>
            ) : (
                <ArticleDetailModal
                    articleDetail={articleDetail}
                    articleDownloads={articleDownloads}
                    translationFiles={translationFiles}
                    loadingDetail={false}
                    onClose={() => navigate("/")}
                />
            )}
        </div>
    );
};

export default ArticlePage;