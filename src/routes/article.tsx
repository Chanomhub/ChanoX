import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchArticleBySlug, fetchArticleDownloads } from "./api";
import { X, Heart, Share2, Calendar, Tag, Clock, Bookmark, MessageCircle } from "lucide-react";
import ImageComponent from "../component/ImageComponent";
import DOMPurify from "dompurify";
import ArticleDownloads from './download/ArticleDetailDownloads';


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

interface ArticleDownload {
    id: number;
    articleId: number;
    name: string;
    url: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface ArticleDetailModalProps {
    articleDetail: ArticleDetail | null;
    articleDownloads: ArticleDownload[];
    loadingDetail: boolean;
    onClose: () => void;
}

// ArticleDetailModal Component
const ArticleDetailModal: React.FC<ArticleDetailModalProps> = ({
                                                                   articleDetail,
                                                                   articleDownloads,
                                                                   loadingDetail,
                                                                   onClose,
                                                               }) => {
    const [activeTab, setActiveTab] = useState<'content' | 'gallery' | 'downloads'>('content');
    const [isFavorited, setIsFavorited] = useState(articleDetail?.favorited || false);
    const [favoritesCount, setFavoritesCount] = useState(articleDetail?.favoritesCount || 0);

    const formatDate = (timestamp: number | string) => {
        return new Date(timestamp).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatMarkdownContent = (content: string): string => {
        if (!content) return '';
        let formattedContent = content.replace(/\n/g, '<br />');
        formattedContent = formattedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formattedContent = formattedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
        formattedContent = formattedContent.replace(/- (.*?)(?:\n|$)/g, '<li>$1</li>');
        if (formattedContent.includes('<li>')) {
            formattedContent = formattedContent.replace(/(<li>.*?<\/li>)+/g, (match) => {
                return `<ul>${match}</ul>`;
            });
        }
        return formattedContent;
    };



    const handleFavorite = () => {
        setIsFavorited(!isFavorited);
        setFavoritesCount(isFavorited ? favoritesCount - 1 : favoritesCount + 1);
    };

    if (!articleDetail && !loadingDetail) {
        return (
            <div className="min-h-screen bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-base-100 rounded-xl max-w-4xl w-full shadow-2xl">
                    <div className="text-center py-12">
                        <p className="text-lg font-medium">ไม่พบรายละเอียดบทความ</p>
                        <button className="btn btn-primary mt-6" onClick={onClose}>
                            ปิด
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
            <div className="bg-base-100 rounded-xl max-w-5xl w-full shadow-2xl flex flex-col">
                {loadingDetail ? (
                    <div className="flex flex-col justify-center items-center h-64">
                        <span className="loading loading-spinner loading-lg"></span>
                        <p className="mt-4 text-base-content/70">กำลังโหลดข้อมูล...</p>
                    </div>
                ) : articleDetail ? (
                    <div className="flex flex-col min-h-[50vh]">
                        {/* Header */}
                        <div className="relative">
                            {articleDetail.mainImage && (
                                <div className="h-64 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-b from-black/70 to-transparent z-10"></div>
                                    <ImageComponent
                                        src={articleDetail.mainImage}
                                        alt={articleDetail.title}
                                        width={1200}
                                        height={400}
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        className="absolute top-4 right-4 btn btn-circle btn-sm bg-base-100/30 hover:bg-base-100/50 backdrop-blur-sm z-20 border-0"
                                        onClick={onClose}
                                    >
                                        <X size={18} className="text-white" />
                                    </button>
                                    <div className="absolute bottom-4 left-6 z-20">
                                        <div className="flex items-center gap-2">
                                            {articleDetail.categoryList.map((category, index) => (
                                                <span key={index} className="badge badge-primary">
                                                    {category}
                                                </span>
                                            ))}
                                        </div>
                                        <h2
                                            className="text-3xl font-bold mt-2 text-black dark:text-white"
                                            style={{ WebkitTextStroke: '1px black' }}
                                        >
                                            {articleDetail.title}
                                        </h2>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Tabs */}
                        <div className="border-b border-base-300">
                            <div className="flex px-6">
                                <button
                                    className={`px-4 py-3 font-medium relative ${
                                        activeTab === 'content' ? 'text-primary' : 'text-base-content/70'
                                    }`}
                                    onClick={() => setActiveTab('content')}
                                >
                                    เนื้อหา
                                    {activeTab === 'content' && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
                                    )}
                                </button>
                                {articleDetail.images.length > 0 && (
                                    <button
                                        className={`px-4 py-3 font-medium relative ${
                                            activeTab === 'gallery' ? 'text-primary' : 'text-base-content/70'
                                        }`}
                                        onClick={() => setActiveTab('gallery')}
                                    >
                                        แกลเลอรี ({articleDetail.images.length})
                                        {activeTab === 'gallery' && (
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
                                        )}
                                    </button>
                                )}
                                {articleDownloads.length > 0 && (
                                    <button
                                        className={`px-4 py-3 font-medium relative ${
                                            activeTab === 'downloads' ? 'text-primary' : 'text-base-content/70'
                                        }`}
                                        onClick={() => setActiveTab('downloads')}
                                    >
                                        ดาวน์โหลด ({articleDownloads.length})
                                        {activeTab === 'downloads' && (
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-grow overflow-y-auto max-h-[70vh]">
                            {activeTab === 'content' && (
                                <div className="p-6">
                                    {/* Author and Date */}
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            {articleDetail.author && (
                                                <div className="flex items-center gap-2">
                                                    <div className="avatar">
                                                        <div className="w-10 h-10 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                                                            <img
                                                                src={articleDetail.author.image}
                                                                alt={articleDetail.author.username}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{articleDetail.author.username}</span>
                                                        <span className="text-xs text-base-content/70">
                                                            {articleDetail.author.bio && articleDetail.author.bio.substring(0, 50)}
                                                            {articleDetail.author.bio && articleDetail.author.bio.length > 50
                                                                ? '...'
                                                                : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                className={`btn btn-sm gap-1 ${isFavorited ? 'btn-primary' : 'btn-outline'}`}
                                                onClick={handleFavorite}
                                            >
                                                <Heart size={16} className={isFavorited ? 'fill-current' : ''} />
                                                <span>{favoritesCount}</span>
                                            </button>
                                            <button className="btn btn-sm btn-outline">
                                                <Share2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Info Pills */}
                                    <div className="flex flex-wrap gap-3 mb-6">
                                        <div className="badge badge-outline gap-1 p-3">
                                            <Calendar size={14} />
                                            <span>{formatDate(articleDetail.createdAt)}</span>
                                        </div>
                                        <div className="badge badge-outline gap-1 p-3">
                                            <Clock size={14} />
                                            <span>อัปเดตล่าสุด: {formatDate(articleDetail.updatedAt)}</span>
                                        </div>
                                        <div className="badge badge-outline gap-1 p-3">
                                            <Tag size={14} />
                                            <span>เวอร์ชัน {articleDetail.version}</span>
                                        </div>
                                        {articleDetail.status && (
                                            <div
                                                className={`badge gap-1 p-3 ${
                                                    articleDetail.status === 'published'
                                                        ? 'badge-success'
                                                        : articleDetail.status === 'draft'
                                                            ? 'badge-warning'
                                                            : 'badge-info'
                                                }`}
                                            >
                                                <span>{articleDetail.status}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Description */}
                                    <div className="mb-8">
                                        <p className="text-lg font-medium italic bg-base-200 p-4 rounded-lg border-l-4 border-primary">
                                            {articleDetail.description}
                                        </p>
                                    </div>

                                    {/* Content */}
                                    <div
                                        className="prose prose-lg max-w-none"
                                        dangerouslySetInnerHTML={{
                                            __html: DOMPurify.sanitize(formatMarkdownContent(articleDetail.body)),
                                        }}
                                    />

                                    {/* Tags and Platforms */}
                                    <div className="mt-8 pt-6 border-t border-base-300 space-y-4">
                                        {articleDetail.tagList.length > 0 && (
                                            <div>
                                                <h3 className="font-semibold mb-2 flex items-center gap-2">
                                                    <Tag size={16} />
                                                    แท็ก
                                                </h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {articleDetail.tagList.map((tag, index) => (
                                                        <span
                                                            key={index}
                                                            className="badge badge-ghost hover:badge-ghost/70 cursor-pointer"
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {articleDetail.platformList.length > 0 && (
                                            <div>
                                                <h3 className="font-semibold mb-2">แพลตฟอร์ม</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {articleDetail.platformList.map((platform, index) => (
                                                        <span key={index} className="badge badge-secondary">
                                                            {platform}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'gallery' && (
                                <div className="p-6">
                                    <h3 className="text-xl font-semibold mb-4">แกลเลอรีรูปภาพ</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {articleDetail.images.map((image, index) => (
                                            <div
                                                key={index}
                                                className="rounded-lg overflow-hidden border border-base-300 hover:shadow-md transition-shadow"
                                            >
                                                <ImageComponent
                                                    src={image}
                                                    alt={`ภาพประกอบ ${index + 1}`}
                                                    width={400}
                                                    height={300}
                                                    className="w-full h-48 object-cover"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'downloads' && (
                                <ArticleDownloads downloads={articleDownloads as any} />
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-base-300 bg-base-200/50 flex justify-between items-center">
                            <div className="flex gap-6">
                                <button className="flex items-center gap-1 text-base-content/70 hover:text-primary">
                                    <Bookmark size={16} />
                                    <span>บันทึก</span>
                                </button>
                                <button className="flex items-center gap-1 text-base-content/70 hover:text-primary">
                                    <MessageCircle size={16} />
                                    <span>แสดงความคิดเห็น</span>
                                </button>
                            </div>
                            <div>
                                {articleDetail.author && articleDetail.author.following === false && (
                                    <button className="btn btn-sm btn-outline">
                                        ติดตาม {articleDetail.author.username}
                                    </button>
                                )}
                                {articleDetail.author && articleDetail.author.following === true && (
                                    <button className="btn btn-sm btn-primary">กำลังติดตาม</button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-lg font-medium">ไม่พบรายละเอียดบทความ</p>
                        <button className="btn btn-primary mt-6" onClick={onClose}>
                            ปิด
                        </button>
                    </div>
                )}
            </div>
    );
};

// Main ArticlePage Component
const ArticlePage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();

    const [articleDetail, setArticleDetail] = useState<ArticleDetail | null>(null);
    const [articleDownloads, setArticleDownloads] = useState<ArticleDownload[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchArticleDetails = async () => {
            if (!slug) return;

            setLoading(true);
            try {
                const article = await fetchArticleBySlug(slug);
                setArticleDetail(article);
                const downloads = await fetchArticleDownloads(article.id);
                setArticleDownloads(downloads || []);
            } catch (err) {
                console.error("Error fetching article details:", err);
                setError("ไม่สามารถโหลดข้อมูลบทความได้");
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
                loadingDetail={false}
                onClose={handleClose}
            />
        </div>
    );
};

export default ArticlePage;