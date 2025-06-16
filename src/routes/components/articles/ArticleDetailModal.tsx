import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { X, Heart, Maximize2, Minimize2 } from "lucide-react";
import DOMPurify from "dompurify";
import { ArticleDownloads } from "../../download/ArticleDownloads.tsx";
import { TranslationFiles } from "../../download/TranslationFiles.tsx";
import { ArticleDetail, ArticleDownload, TranslationFile } from "./types/types.ts";
import ImageComponent from "../../../component/ImageComponent.tsx";

export const ArticleDetailModal: React.FC<{
    articleDetail: ArticleDetail | null;
    articleDownloads: ArticleDownload[];
    translationFiles: TranslationFile[];
    loadingDetail: boolean;
    onClose: () => void;
}> = ({ articleDetail, articleDownloads, translationFiles, loadingDetail, onClose }) => {
    const [activeTab, setActiveTab] = useState<'content' | 'gallery' | 'downloads' | 'translations'>('content');
    const [isFavorited, setIsFavorited] = useState(articleDetail?.favorited || false);
    const [favoritesCount, setFavoritesCount] = useState(articleDetail?.favoritesCount || 0);
    const [isLoadingFavorite, setIsLoadingFavorite] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Fetch token when component mounts
    useEffect(() => {
        const fetchToken = async () => {
            try {
                const fetchedToken: string | null = await invoke("get_token");
                setToken(fetchedToken);
            } catch (error) {
                console.error("Failed to fetch token:", error);
            }
        };
        fetchToken();
    }, []);

    // Handle ESC key to exit fullscreen or close modal
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                if (isFullscreen) {
                    setIsFullscreen(false);
                } else {
                    onClose();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen, onClose]);

    if (!articleDetail && !loadingDetail) return <div className="text-center">ไม่พบรายละเอียดบทความ</div>;

    const handleFavorite = async () => {
        if (!articleDetail?.slug) {
            console.error("Article slug is missing");
            alert("Cannot favorite article: Article details are incomplete.");
            return;
        }

        if (!token) {
            console.error("No authentication token available");
            alert("Please log in to favorite this article.");
            return;
        }

        setIsLoadingFavorite(true);
        try {
            const method = isFavorited ? 'DELETE' : 'POST';
            const response = await fetch(`https://api.chanomhub.online/api/articles/${articleDetail.slug}/favorite`, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setIsFavorited(!isFavorited);
                setFavoritesCount(data.article.favoritesCount);
            } else if (response.status === 401) {
                console.error("Unauthorized: Invalid or expired token");
                alert("Your session has expired. Please log in again.");
            } else {
                const errorData = await response.json();
                console.error('Failed to update favorite status:', errorData.message);
                alert(`Error: ${errorData.message}`);
            }
        } catch (error) {
            console.error('Error updating favorite:', error);
            alert("An error occurred while updating favorite status.");
        } finally {
            setIsLoadingFavorite(false);
        }
    };

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    const modalClasses = isFullscreen
        ? "fixed inset-0 z-50 bg-base-100 flex flex-col"
        : "bg-base-100 rounded-xl max-w-5xl w-full shadow-2xl mx-auto";

    const contentAreaClasses = isFullscreen
        ? "flex-grow overflow-y-auto"
        : "flex-grow overflow-y-auto max-h-[70vh]";

    return (
        <div className={modalClasses}>
            {loadingDetail ? (
                <div className="flex justify-center items-center h-64">
                    <span className="loading loading-spinner loading-lg"></span>
                </div>
            ) : articleDetail ? (
                <div className="flex flex-col h-full">
                    {/* Header with image and title */}
                    <div className="relative">
                        {articleDetail.mainImage && (
                            <div className={`${isFullscreen ? 'h-80' : 'h-64'} relative overflow-hidden ${!isFullscreen ? 'rounded-t-xl' : ''}`}>
                                <div className="absolute inset-0 bg-gradient-to-b from-black/70 to-transparent z-10"></div>
                                <ImageComponent
                                    src={articleDetail.mainImage}
                                    alt={articleDetail.title}
                                    className="w-full h-full object-cover"
                                    width={1280}
                                    height={isFullscreen ? 320 : 256}
                                    quality={90}
                                />
                                <div className="absolute top-4 right-4 z-20 flex gap-2">
                                    <button
                                        className="btn btn-circle btn-sm bg-black/50 border-none hover:bg-black/70 text-white"
                                        onClick={toggleFullscreen}
                                        title={isFullscreen ? "ออกจากโหมดเต็มจอ" : "โหมดเต็มจอ"}
                                    >
                                        {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                                    </button>
                                    <button
                                        className="btn btn-circle btn-sm bg-black/50 border-none hover:bg-black/70 text-white"
                                        onClick={onClose}
                                        title="ปิด"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                                <h2 className={`absolute bottom-4 left-6 z-20 ${isFullscreen ? 'text-4xl' : 'text-3xl'} font-bold text-white drop-shadow-lg`}>
                                    {articleDetail.title}
                                </h2>
                            </div>
                        )}
                    </div>

                    {/* Tab Navigation */}
                    <div className="border-b border-base-300 bg-base-100 sticky top-0 z-10">
                        <div className="flex px-6 overflow-x-auto">
                            <button
                                className={`px-4 py-3 whitespace-nowrap border-b-2 transition-colors ${
                                    activeTab === 'content'
                                        ? 'text-primary border-primary'
                                        : 'text-base-content/70 border-transparent hover:text-primary hover:border-primary/50'
                                }`}
                                onClick={() => setActiveTab('content')}
                            >
                                เนื้อหา
                            </button>
                            {articleDetail.images.length > 0 && (
                                <button
                                    className={`px-4 py-3 whitespace-nowrap border-b-2 transition-colors ${
                                        activeTab === 'gallery'
                                            ? 'text-primary border-primary'
                                            : 'text-base-content/70 border-transparent hover:text-primary hover:border-primary/50'
                                    }`}
                                    onClick={() => setActiveTab('gallery')}
                                >
                                    แกลเลอรี ({articleDetail.images.length})
                                </button>
                            )}
                            <button
                                className={`px-4 py-3 whitespace-nowrap border-b-2 transition-colors ${
                                    activeTab === 'downloads'
                                        ? 'text-primary border-primary'
                                        : 'text-base-content/70 border-transparent hover:text-primary hover:border-primary/50'
                                }`}
                                onClick={() => setActiveTab('downloads')}
                            >
                                ดาวน์โหลด ({articleDownloads.length})
                            </button>
                            {translationFiles.length > 0 && (
                                <button
                                    className={`px-4 py-3 whitespace-nowrap border-b-2 transition-colors ${
                                        activeTab === 'translations'
                                            ? 'text-primary border-primary'
                                            : 'text-base-content/70 border-transparent hover:text-primary hover:border-primary/50'
                                    }`}
                                    onClick={() => setActiveTab('translations')}
                                >
                                    ไฟล์แปล ({translationFiles.length})
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className={contentAreaClasses}>
                        {activeTab === 'content' && (
                            <div className={`p-6 ${isFullscreen ? 'max-w-4xl mx-auto' : ''}`}>
                                {/* Author info and favorite button */}
                                <div className="flex justify-between items-center mb-6 bg-base-200/50 p-4 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        {articleDetail.author && (
                                            <div className="flex items-center gap-3">
                                                <ImageComponent
                                                    src={articleDetail.author.image}
                                                    alt={articleDetail.author.username}
                                                    className="w-12 h-12 rounded-full ring-2 ring-primary/20"
                                                    width={48}
                                                    height={48}
                                                    quality={60}
                                                />
                                                <div>
                                                    <span className="font-semibold text-lg">{articleDetail.author.username}</span>
                                                    <div className="text-sm text-base-content/60">
                                                        {new Date(articleDetail.createdAt).toLocaleDateString('th-TH', {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        className={`btn btn-sm gap-2 ${
                                            isLoadingFavorite ? 'loading' : ''
                                        } ${
                                            isFavorited ? 'btn-error' : 'btn-outline btn-error'
                                        }`}
                                        onClick={handleFavorite}
                                        disabled={isLoadingFavorite}
                                    >
                                        <Heart size={16} className={isFavorited ? 'fill-current' : ''} />
                                        <span>{favoritesCount}</span>
                                    </button>
                                </div>

                                {/* Article Content */}
                                <div
                                    className={`prose max-w-none ${isFullscreen ? 'prose-lg' : ''}`}
                                    dangerouslySetInnerHTML={{
                                        __html: DOMPurify.sanitize(articleDetail.body),
                                    }}
                                />
                            </div>
                        )}

                        {activeTab === 'gallery' && (
                            <div className={`p-6 ${isFullscreen ? 'max-w-7xl mx-auto' : ''}`}>
                                <div className={`grid gap-4 ${
                                    isFullscreen
                                        ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
                                        : 'grid-cols-1 md:grid-cols-3'
                                }`}>
                                    {articleDetail.images.map((image, index) => (
                                        <div key={index} className="group relative overflow-hidden rounded-lg">
                                            <ImageComponent
                                                src={image}
                                                alt={`ภาพประกอบ ${index + 1}`}
                                                className={`w-full object-cover transition-transform group-hover:scale-105 ${
                                                    isFullscreen ? 'h-60' : 'h-48'
                                                }`}
                                                width={400}
                                                height={isFullscreen ? 240 : 192}
                                                quality={70}
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'downloads' && (
                            <div className={isFullscreen ? 'max-w-4xl mx-auto' : ''}>
                                <ArticleDownloads downloads={articleDownloads} />
                            </div>
                        )}

                        {activeTab === 'translations' && (
                            <div className={isFullscreen ? 'max-w-4xl mx-auto' : ''}>
                                <TranslationFiles translationFiles={translationFiles} />
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-center py-12">
                    <p>ไม่พบรายละเอียดบทความ</p>
                    <button className="btn btn-primary mt-6" onClick={onClose}>
                        ปิด
                    </button>
                </div>
            )}
        </div>
    );
};