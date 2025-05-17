import React, { useState } from "react";
import { X, Heart } from "lucide-react";
import DOMPurify from "dompurify";
import { ArticleDownloads } from "../../download/ArticleDownloads.tsx";
import { TranslationFiles } from "../../download/TranslationFiles.tsx";
import { ArticleDetail, ArticleDownload, TranslationFile } from "./types/types.ts";

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

    if (!articleDetail && !loadingDetail) return <div className="text-center">ไม่พบรายละเอียดบทความ</div>;

    return (
        <div className="bg-base-100 rounded-xl max-w-5xl w-full shadow-2xl">
            {loadingDetail ? (
                <div className="flex justify-center items-center h-64">
                    <span className="loading loading-spinner loading-lg"></span>
                </div>
            ) : articleDetail ? (
                <div className="flex flex-col min-h-[50vh]">
                    {/* Header with image and title */}
                    <div className="relative">
                        {articleDetail.mainImage && (
                            <div className="h-64 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-b from-black/70 to-transparent z-10"></div>
                                <img
                                    src={articleDetail.mainImage}
                                    alt={articleDetail.title}
                                    className="w-full h-full object-cover"
                                />
                                <button className="absolute top-4 right-4 btn btn-circle btn-sm" onClick={onClose}>
                                    <X size={18} />
                                </button>
                                <h2 className="absolute bottom-4 left-6 z-20 text-3xl font-bold text-white">
                                    {articleDetail.title}
                                </h2>
                            </div>
                        )}
                    </div>

                    {/* Tab Navigation */}
                    <div className="border-b border-base-300">
                        <div className="flex px-6">
                            <button
                                className={`px-4 py-3 ${activeTab === 'content' ? 'text-primary' : ''}`}
                                onClick={() => setActiveTab('content')}
                            >
                                เนื้อหา
                            </button>
                            {articleDetail.images.length > 0 && (
                                <button
                                    className={`px-4 py-3 ${activeTab === 'gallery' ? 'text-primary' : ''}`}
                                    onClick={() => setActiveTab('gallery')}
                                >
                                    แกลเลอรี ({articleDetail.images.length})
                                </button>
                            )}
                            <button
                                className={`px-4 py-3 ${activeTab === 'downloads' ? 'text-primary' : ''}`}
                                onClick={() => setActiveTab('downloads')}
                            >
                                ดาวน์โหลด ({articleDownloads.length})
                            </button>
                            {translationFiles.length > 0 && (
                                <button
                                    className={`px-4 py-3 ${activeTab === 'translations' ? 'text-primary' : ''}`}
                                    onClick={() => setActiveTab('translations')}
                                >
                                    ไฟล์แปล ({translationFiles.length})
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-grow overflow-y-auto max-h-[70vh]">
                        {activeTab === 'content' && (
                            <div className="p-6">
                                {/* Author info */}
                                <div className="flex justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        {articleDetail.author && (
                                            <div className="flex items-center gap-2">
                                                <img
                                                    src={articleDetail.author.image}
                                                    alt={articleDetail.author.username}
                                                    className="w-10 h-10 rounded-full"
                                                />
                                                <span>{articleDetail.author.username}</span>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        className="btn btn-sm"
                                        onClick={() => {
                                            setIsFavorited(!isFavorited);
                                            setFavoritesCount(isFavorited ? favoritesCount - 1 : favoritesCount + 1);
                                        }}
                                    >
                                        <Heart size={16} className={isFavorited ? 'fill-current' : ''} />
                                        <span>{favoritesCount}</span>
                                    </button>
                                </div>

                                {/* Article Content */}
                                <div
                                    className="prose max-w-none"
                                    dangerouslySetInnerHTML={{
                                        __html: DOMPurify.sanitize(articleDetail.body)
                                    }}
                                />
                            </div>
                        )}

                        {activeTab === 'gallery' && (
                            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                {articleDetail.images.map((image, index) => (
                                    <img
                                        key={index}
                                        src={image}
                                        alt={`ภาพประกอบ ${index + 1}`}
                                        className="w-full h-48 object-cover rounded-lg"
                                    />
                                ))}
                            </div>
                        )}

                        {activeTab === 'downloads' && (
                            <ArticleDownloads downloads={articleDownloads} />
                        )}

                        {activeTab === 'translations' && (
                            <TranslationFiles translationFiles={translationFiles} />
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-center py-12">
                    <p>ไม่พบรายละเอียดบทความ</p>
                    <button className="btn btn-primary mt-6" onClick={onClose}>ปิด</button>
                </div>
            )}
        </div>
    );
};