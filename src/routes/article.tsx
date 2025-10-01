import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchArticleBySlug } from "./api";
import { ArticleDetailModal } from "./components/articles/ArticleDetailModal.tsx";
import { ArticleDetail, ArticleDownload } from "./components/articles/types/types.ts";

const ArticlePage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();

    const [articleDetail, setArticleDetail] = useState<ArticleDetail | null>(null);
    const [articleDownloads, setArticleDownloads] = useState<ArticleDownload[]>([]);
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

            } catch (err: any) {
                setError(err.message || "ไม่สามารถโหลดข้อมูลบทความได้");
                setArticleDownloads([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [slug]);

    const handleClose = () => {
        navigate("/");
    };

    return (
        <>
            {/* Modal Backdrop */}
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
                {loading ? (
                    <div className="bg-base-100 rounded-xl p-8 text-center">
                        <div className="flex flex-col items-center gap-4">
                            <span className="loading loading-spinner loading-lg text-primary"></span>
                            <p className="text-lg">กำลังโหลดข้อมูล...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="bg-base-100 rounded-xl p-8 text-center max-w-md">
                        <div className="mb-4">
                            <div className="w-16 h-16 mx-auto mb-4 bg-error/20 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-semibold text-error mb-2">เกิดข้อผิดพลาด</h2>
                            <p className="text-base-content/70">{error}</p>
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={handleClose}
                        >
                            กลับสู่หน้าหลัก
                        </button>
                    </div>
                ) : !articleDetail ? (
                    <div className="bg-base-100 rounded-xl p-8 text-center max-w-md">
                        <div className="mb-4">
                            <div className="w-16 h-16 mx-auto mb-4 bg-warning/20 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.291-1.005-5.824-2.563M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-semibold mb-2">ไม่พบบทความ</h2>
                            <p className="text-base-content/70">บทความที่คุณค้นหาไม่มีในระบบ</p>
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={handleClose}
                        >
                            กลับสู่หน้าหลัก
                        </button>
                    </div>
                ) : (
                    <ArticleDetailModal
                        articleDetail={articleDetail}
                        articleDownloads={articleDownloads}
                        loadingDetail={false}
                        onClose={handleClose}
                    />
                )}
            </div>
        </>
    );
};

export default ArticlePage;