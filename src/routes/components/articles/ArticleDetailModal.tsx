import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { X, Heart, Maximize2, Minimize2 } from "lucide-react";
import DOMPurify from "dompurify";
import { ArticleDownloads } from "../../download/ArticleDownloads.tsx";
import { ArticleDetail, ArticleDownload } from "./types/types.ts";
import ImageComponent from "../../../component/ImageComponent.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const ArticleDetailModal: React.FC<{
    articleDetail: ArticleDetail | null;
    articleDownloads: ArticleDownload[];
    loadingDetail: boolean;
    onClose: () => void;
}> = ({ articleDetail, articleDownloads, loadingDetail, onClose }) => {
    const [activeTab, setActiveTab] = useState<'content' | 'downloads'>('content');
    const [isFavorited, setIsFavorited] = useState(articleDetail?.favorited || false);
    const [favoritesCount, setFavoritesCount] = useState(articleDetail?.favoritesCount || 0);
    const [isLoadingFavorite, setIsLoadingFavorite] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Fetch token on mount
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

    // Handle ESC key for fullscreen toggle or modal close
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

    // Handle favorite action
    const handleFavorite = async () => {
        if (!articleDetail?.slug || !token) {
            alert(!token ? "Please log in to favorite this article." : "Article details are incomplete.");
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
            } else {
                const errorData = await response.json();
                alert(`Error: ${errorData.message || 'Failed to update favorite status.'}`);
            }
        } catch (error) {
            alert("An error occurred while updating favorite status.");
        } finally {
            setIsLoadingFavorite(false);
        }
    };

    const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

    if (!articleDetail && !loadingDetail) {
        return (
            <Dialog open={true} onOpenChange={onClose}>
                <DialogContent className="max-w-md p-6">
                    <DialogHeader>
                        <DialogTitle>ไม่พบบทความ</DialogTitle>
                        <DialogDescription>บทความที่คุณกำลังมองหาไม่มีอยู่</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={onClose} variant="outline">ปิด</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent
                className={`flex flex-col bg-background text-foreground rounded-lg overflow-hidden transition-all duration-300 ${
                    isFullscreen ? 'max-w-full h-screen' : 'max-w-4xl max-h-[90vh]'
                }`}
                aria-describedby="article-detail-description"
            >
                {loadingDetail ? (
                    <div className="flex justify-center items-center h-64">
                        <Skeleton className="h-12 w-12 rounded-full" />
                    </div>
                ) : (
                    <div className="flex flex-col h-full">
                        {/* Header Image */}
                        {articleDetail?.mainImage && (
                            <div className={`relative ${isFullscreen ? 'h-96' : 'h-60'}`}>
                                <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent z-10" />
                                <ImageComponent
                                    src={articleDetail.mainImage}
                                    alt={articleDetail.title}
                                    className="w-full h-full object-cover"
                                    width={1280}
                                    height={isFullscreen ? 384 : 240}
                                    quality={85}
                                    loading="eager"
                                />
                                <div className="absolute top-4 right-4 z-20 flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 bg-background/80 hover:bg-background/90 text-foreground rounded-full"
                                        onClick={toggleFullscreen}
                                        title={isFullscreen ? "ออกจากโหมดเต็มจอ" : "โหมดเต็มจอ"}
                                        aria-label={isFullscreen ? "ออกจากโหมดเต็มจอ" : "เข้าสู่โหมดเต็มจอ"}
                                    >
                                        {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 bg-background/80 hover:bg-background/90 text-foreground rounded-full"
                                        onClick={onClose}
                                        title="ปิด"
                                        aria-label="ปิดหน้าต่าง"
                                    >
                                        <X size={20} />
                                    </Button>
                                </div>
                                <DialogTitle className={`absolute bottom-6 left-6 z-20 font-bold text-white drop-shadow-lg ${
                                    isFullscreen ? 'text-3xl' : 'text-2xl'
                                }`}>
                                    {articleDetail.title}
                                </DialogTitle>
                                <DialogDescription className="sr-only">{articleDetail.description}</DialogDescription>
                            </div>
                        )}

                        {/* Tabs */}
                        <Tabs
                            value={activeTab}
                            onValueChange={(value) => setActiveTab(value as 'content' | 'downloads')}
                            className="flex-1 flex flex-col"
                        >
                            <TabsList className="grid grid-cols-2 bg-muted mx-4 mt-4 rounded-lg">
                                <TabsTrigger
                                    value="content"
                                    className="py-3 text-base font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                    aria-label="ดูเนื้อหาบทความ"
                                >
                                    เนื้อหา
                                </TabsTrigger>
                                <TabsTrigger
                                    value="downloads"
                                    className="py-3 text-base font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                    aria-label="ดูไฟล์ดาวน์โหลด"
                                >
                                    ดาวน์โหลด ({articleDownloads.length})
                                </TabsTrigger>
                            </TabsList>

                            {/* Content Tab */}
                            <TabsContent value="content" className="flex-1 overflow-auto p-6">
                                <div className={isFullscreen ? 'max-w-3xl mx-auto' : ''}>
                                    {/* Author and Favorite */}
                                    <div className="flex justify-between items-center mb-6 bg-muted p-4 rounded-lg shadow-sm">
                                        {articleDetail?.author && (
                                            <div className="flex items-center gap-4">
                                                <ImageComponent
                                                    src={articleDetail.author.image}
                                                    alt={articleDetail.author.username}
                                                    className="w-10 h-10 rounded-full ring-1 ring-border"
                                                    width={40}
                                                    height={40}
                                                    quality={60}
                                                />
                                                <div>
                                                    <span className="font-semibold text-base">{articleDetail.author.username}</span>
                                                    <div className="text-sm text-muted-foreground">
                                                        {new Date(articleDetail.createdAt).toLocaleDateString('th-TH', {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <Button
                                            variant={isFavorited ? "destructive" : "outline"}
                                            size="sm"
                                            onClick={handleFavorite}
                                            disabled={isLoadingFavorite}
                                            className="flex items-center gap-2"
                                            aria-label={isFavorited ? "ลบออกจากรายการโปรด" : "เพิ่มลงในรายการโปรด"}
                                        >
                                            <Heart size={16} className={isFavorited ? 'fill-current' : ''} />
                                            <span>{favoritesCount}</span>
                                        </Button>
                                    </div>

                                    {/* Article Body */}
                                    <div
                                        className={`prose prose-invert max-w-none ${isFullscreen ? 'prose-lg' : ''} mb-8`}
                                        dangerouslySetInnerHTML={{
                                            __html: DOMPurify.sanitize(articleDetail?.body || ''),
                                        }}
                                    />

                                    {/* Gallery */}
                                    {articleDetail?.images && articleDetail.images.length > 0 && (
                                        <div className="mt-8 border-t pt-6">
                                            <h3 className="text-lg font-semibold mb-4">แกลเลอรี</h3>
                                            <div className={`grid gap-4 ${
                                                isFullscreen ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'
                                            }`}>
                                                {articleDetail.images.map((image, index) => (
                                                    <div key={index} className="relative overflow-hidden rounded-lg group">
                                                        <ImageComponent
                                                            src={image}
                                                            alt={`ภาพประกอบ ${index + 1}`}
                                                            className="w-full h-48 object-cover transition-transform group-hover:scale-105"
                                                            width={300}
                                                            height={192}
                                                            quality={70}
                                                        />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            {/* Downloads Tab */}
                            <TabsContent value="downloads" className="p-6">
                                <ArticleDownloads downloads={articleDownloads} />
                            </TabsContent>
                        </Tabs>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};