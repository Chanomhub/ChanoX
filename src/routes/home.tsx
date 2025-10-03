// home.tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import React, { useState, useEffect } from "react";
import { Search, X, Filter, AlertCircle, Sparkles, TrendingUp } from "lucide-react";
import { Category, Tag, Platform, fetchArticles, fetchCategories, fetchTags, fetchPlatforms, ArticleSummary } from "./api";
import ImageComponent from "../component/ImageComponent";
import { useNavigate } from "react-router-dom";

const Home: React.FC = () => {
    const navigate = useNavigate();
    const GAMES_PER_PAGE = 12;

    // State definitions
    const [games, setGames] = useState<ArticleSummary[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [platforms, setPlatforms] = useState<Platform[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [totalGames, setTotalGames] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [showFilterModal, setShowFilterModal] = useState(false);

    // New state for end-of-pages alert
    const [showEndAlert, setShowEndAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState("");

    // Entity mappings (no longer needed as categories, platforms, tags are strings)

    // Helper functions
    const toggleFilter = (
        filterId: string,
        setSelectedFilters: React.Dispatch<React.SetStateAction<string[]>>
    ) => {
        setSelectedFilters((prev) => {
            if (prev.includes(filterId)) {
                return prev.filter((id) => id !== filterId);
            } else {
                return [...prev, filterId];
            }
        });
        setCurrentPage(1);
    };

    // Enhanced searchGames function with end-of-pages detection
    const searchGames = async (pageNumber: number = currentPage) => {
        setLoading(true);
        try {
            const offset = (pageNumber - 1) * GAMES_PER_PAGE;
            const { articles, articlesCount } = await fetchArticles({
                limit: GAMES_PER_PAGE,
                offset,
                query: searchTerm,
                categories: selectedCategories.length > 0 ? selectedCategories : null,
                platforms: selectedPlatforms.length > 0 ? selectedPlatforms : null,
                tags: selectedTags.length > 0 ? selectedTags : null,
                sort: ["updatedAt:desc"],
            });

            // Check if we're trying to go to a page with no data
            if (articles.length === 0 && pageNumber > 1) {
                // If no games found and we're not on the first page, show alert and go back
                setAlertMessage("อุ้ยดูเหมือนจะหมดแล้วนะ");
                setShowEndAlert(true);
                // Auto-hide alert after 3 seconds
                setTimeout(() => setShowEndAlert(false), 3000);
                return false; // Indicate that we hit the end
            }

            setGames(articles);
            setTotalGames(articlesCount);

            return true; // Indicate success
        } catch (error) {
            console.error("Error searching games:", error);
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Enhanced handleNextPage function
    const handleNextPage = async () => {
        const nextPage = currentPage + 1;
        setCurrentPage(nextPage);

        const success = await searchGames(nextPage);
        if (!success) {
            // If we hit the end, go back to the previous page
            setCurrentPage(currentPage);
        }
    };

    // Enhanced handlePreviousPage function
    const handlePreviousPage = () => {
        setCurrentPage((prev) => Math.max(1, prev - 1));
    };

    // Enhanced handlePageClick function
    const handlePageClick = async (page: number) => {
        setCurrentPage(page);

        const success = await searchGames(page);
        if (!success && page > 1) {
            // If we hit the end, go back to the previous page
            setCurrentPage(currentPage);
        }
    };

    const navigateToArticle = (gameSlug: string) => {
        navigate(`/article/${gameSlug}`);
    };

    // Initial data load
    useEffect(() => {
        const initData = async () => {
            setLoading(true);
            try {
                const categoriesData = await fetchCategories();
                setCategories(categoriesData);
                const tagsData = await fetchTags();
                setTags(tagsData);
                const platformsData = await fetchPlatforms();
                setPlatforms(platformsData);
                // setEntityMaps is no longer needed as categories, platforms, tags are strings
                const { articles, articlesCount } = await fetchArticles({ limit: GAMES_PER_PAGE });
                setGames(articles);
                setTotalGames(articlesCount);
            } catch (error) {
                console.error("Error initializing data:", error);
            } finally {
                setLoading(false);
            }
        };
        initData();
    }, []);

    useEffect(() => {
        searchGames();
    }, [selectedCategories, selectedPlatforms, selectedTags, currentPage]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1);
        searchGames(1);
    };

    const formatDate = (timestamp: number | string) => {
        const date = new Date(timestamp);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const clearAllFilters = () => {
        setSelectedCategories([]);
        setSelectedPlatforms([]);
        setSelectedTags([]);
        setCurrentPage(1);
    };

    const totalPages = Math.ceil(totalGames / GAMES_PER_PAGE);

        const renderSkeletonCard = () => (
            <Card className="flex flex-col space-y-3">
                <Skeleton className="h-[125px] w-full rounded-xl" />
                <div className="space-y-2 p-4">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                </div>
            </Card>
        );
        const renderEndAlert = () => {
            if (!showEndAlert) return null;
    
            return (
                <div className="fixed top-4 right-4 z-50">
                    <Alert variant="destructive" className="max-w-sm">
                        <AlertCircle size={20} className="animate-pulse" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{alertMessage}</AlertDescription>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => setShowEndAlert(false)}
                        >
                            <X size={16} />
                        </Button>
                    </Alert>
                </div>
            );
        };
    const renderFilterModal = () => (
        <Dialog open={showFilterModal} onOpenChange={setShowFilterModal}>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <Filter size={24} />
                        Filters
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="filter-section">
                        <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                            Categories
                        </h3>
                        <div className="space-y-2">
                            {categories.map((item) => (
                                <div key={item} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`category-${item}`}
                                        checked={selectedCategories.includes(item)}
                                        onCheckedChange={() => toggleFilter(item, setSelectedCategories)}
                                    />
                                    <label
                                        htmlFor={`category-${item}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        {item}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="filter-section">
                        <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                            <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
                            Platforms
                        </h3>
                        <div className="space-y-2">
                            {platforms.map((item) => (
                                <div key={item} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`platform-${item}`}
                                        checked={selectedPlatforms.includes(item)}
                                        onCheckedChange={() => toggleFilter(item, setSelectedPlatforms)}
                                    />
                                    <label
                                        htmlFor={`platform-${item}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        {item}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="filter-section">
                        <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                            <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                            Tags
                        </h3>
                        <div className="space-y-2">
                            {tags.map((item) => (
                                <div key={item} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`tag-${item}`}
                                        checked={selectedTags.includes(item)}
                                        onCheckedChange={() => toggleFilter(item, setSelectedTags)}
                                    />
                                    <label
                                        htmlFor={`tag-${item}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        {item}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex justify-between mt-6 pt-6 border-t">
                    <Button variant="ghost" onClick={clearAllFilters}>
                        Clear All
                    </Button>
                    <Button onClick={() => setShowFilterModal(false)}>
                        Apply Filters
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );

    // Enhanced active filters with better styling

    const renderActiveFilters = () => {
        const hasActiveFilters =
            selectedCategories.length > 0 ||
            selectedPlatforms.length > 0 ||
            selectedTags.length > 0;

        if (!hasActiveFilters) return null;

        return (
            <div className="mt-4">
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Active Filters:</h4>
                <div className="flex flex-wrap gap-2">
                    {selectedCategories.map((cat) => (
                        <Badge key={cat} variant="default" className="text-sm">
                            {cat}
                            <button
                                onClick={() => toggleFilter(cat, setSelectedCategories)}
                                type="button"
                                className="ml-2 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            >
                                <X size={14} />
                            </button>
                        </Badge>
                    ))}
                    {selectedPlatforms.map((platform) => (
                        <Badge key={platform} variant="secondary" className="text-sm">
                            {platform}
                            <button
                                onClick={() => toggleFilter(platform, setSelectedPlatforms)}
                                type="button"
                                className="ml-2 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            >
                                <X size={14} />
                            </button>
                        </Badge>
                    ))}
                    {selectedTags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-sm">
                            {tag}
                            <button
                                onClick={() => toggleFilter(tag, setSelectedTags)}
                                type="button"
                                className="ml-2 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            >
                                <X size={14} />
                            </button>
                        </Badge>
                    ))}
                </div>
            </div>
        );
    };

    const renderPagination = () => {
        if (games.length === 0) return null;

        const getPageNumbers = () => {
            const pages = [];
            const maxPagesToShow = 5;
            let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
            let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

            if (endPage - startPage < maxPagesToShow - 1) {
                startPage = Math.max(1, endPage - maxPagesToShow + 1);
            }

            for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
            }
            return pages;
        };

        return (
            <div className="flex justify-center mt-12">
                <div className="flex items-center space-x-1">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                        aria-label="Previous page"
                    >
                        «
                    </Button>
                    {getPageNumbers().map((page) => (
                        <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="icon"
                            onClick={() => handlePageClick(page)}
                            aria-label={`Page ${page}`}
                        >
                            {page}
                        </Button>
                    ))}
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleNextPage}
                        disabled={games.length < GAMES_PER_PAGE}
                        aria-label="Next page"
                    >
                        »
                    </Button>
                </div>
            </div>
        );
    };

    const renderGameCard = (game: ArticleSummary) => {
        const isNew = game.createdAt && (new Date().getTime() - new Date(game.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000);

        return (
            <Card key={game.id} className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="p-0 relative">
                    <figure className="h-48 overflow-hidden">
                        {game.mainImage ? (
                            <ImageComponent
                                src={game.mainImage}
                                alt={game.title}
                                quality={100}
                                className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
                                loading="lazy"
                            />
                        ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                                <span className="text-muted-foreground">No Image</span>
                            </div>
                        )}
                    </figure>
                    {isNew && (
                        <Badge className="absolute top-3 left-3" variant="destructive">
                            <Sparkles size={12} className="mr-1" />
                            New
                        </Badge>
                    )}
                    {game.tagList && game.tagList.length > 5 && (
                        <Badge className="absolute top-3 right-3" variant="secondary">
                            <TrendingUp size={12} className="mr-1" />
                            Hot
                        </Badge>
                    )}
                </CardHeader>
                <CardContent className="p-4">
                    <CardTitle className="text-lg font-bold line-clamp-2 mb-2">{game.title}</CardTitle>
                    {game.createdAt && <p className="text-sm text-muted-foreground mb-3">{formatDate(game.createdAt)}</p>}
                    <p className="text-sm line-clamp-3 text-muted-foreground leading-relaxed mb-4">
                        {game.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {game.tagList && game.tagList.slice(0, 3).map((tag) => (
                            <Badge
                                key={tag}
                                variant="outline"
                                className="cursor-pointer"
                                onClick={() => {
                                    if (!selectedTags.includes(tag)) {
                                        toggleFilter(tag, setSelectedTags);
                                    }
                                }}
                            >
                                #{tag}
                            </Badge>
                        ))}
                        {game.tagList && game.tagList.length > 3 && (
                            <Badge variant="outline">+{game.tagList.length - 3} more</Badge>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="p-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">
                            {typeof game.author === 'string' ? game.author : game.author.username}
                        </span>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => navigateToArticle(game.slug)}
                        aria-label={`View details for ${game.title}`}
                    >
                        View
                    </Button>
                </CardFooter>
            </Card>
        );
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <div className="container mx-auto px-4 py-8">
                {/* End-of-pages alert */}
                {renderEndAlert()}


                {/* Header */}
                <div className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-sm py-6 mb-8">
                    <div className="container mx-auto px-4">
                        <h1 className="text-5xl font-black mb-8 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent text-center">
                            🎮 Game Library
                        </h1>

                        <form onSubmit={handleSearch} className="flex flex-col gap-4">
                            <div className="flex flex-col md:flex-row gap-4 items-center">
                                <div className="relative flex-grow w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Search for games by title, genre, or platform..."
                                        className="pl-10"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        aria-label="Search games"
                                    />
                                    {searchTerm && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                                            onClick={() => setSearchTerm("")}
                                            aria-label="Clear search"
                                        >
                                            <X size={20} />
                                        </Button>
                                    )}
                                </div>
                                <Button type="submit" size="lg" className="px-8">
                                    Search
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="lg"
                                    className="relative"
                                    onClick={() => setShowFilterModal(true)}
                                    aria-label="Open filters"
                                >
                                    <Filter size={20} />
                                    {(selectedCategories.length + selectedPlatforms.length + selectedTags.length) > 0 && (
                                        <Badge variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center">
                                            {selectedCategories.length + selectedPlatforms.length + selectedTags.length}
                                        </Badge>
                                    )}
                                </Button>
                            </div>
                            {renderActiveFilters()}
                        </form>
                    </div>
                </div>

                {/* Filter modal */}
                {renderFilterModal()}

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="animate-[fadeIn_0.5s_ease-out] opacity-0 animate-fill-forwards" style={{animationDelay: `${i * 0.1}s`}}>
                                {renderSkeletonCard()}
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        {games.length === 0 ? (
                            <div className="text-center py-20">
                                <div className="max-w-md mx-auto">
                                    <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-base-300/50 to-base-300/30 rounded-full flex items-center justify-center">
                                        <Search size={48} className="text-base-content/30" />
                                    </div>
                                    <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-base-content to-base-content/60 bg-clip-text text-transparent">
                                        No games found
                                    </h2>
                                    <p className="text-base-content/60 text-lg leading-relaxed">
                                        Try adjusting your search terms or filters to discover more amazing games in our library.
                                    </p>
                                    {(selectedCategories.length > 0 || selectedPlatforms.length > 0 || selectedTags.length > 0) && (
                                        <button
                                            onClick={clearAllFilters}
                                            className="btn btn-primary btn-lg mt-6 bg-gradient-to-r from-primary to-primary-focus hover:from-primary-focus hover:to-primary transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                                        >
                                            Clear All Filters
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Results header */}
                                <div className="mb-8 text-center">
                                    <p className="text-lg text-base-content/70">
                                        Found <span className="font-bold text-primary">{totalGames}</span> amazing games
                                    </p>
                                </div>

                                {/* Enhanced grid with staggered animation */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                    {games.map((game, index) => (
                                        <div
                                            key={game.id}
                                            style={{animationDelay: `${index * 0.1}s`}}
                                        >
                                            {renderGameCard(game)}
                                        </div>
                                    ))}
                                </div>

                                {renderPagination()}
                            </>
                        )}
                    </>
                )}
            </div>


        </div>
    );
};

export default Home;