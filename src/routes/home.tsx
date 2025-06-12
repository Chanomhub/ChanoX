// home.tsx
import React, { useState, useEffect } from "react";
import { Search, X, Filter, AlertCircle, Sparkles, TrendingUp } from "lucide-react";
import { Game, Category, Tag, Platform, fetchArticles, fetchCategories, fetchTags, fetchPlatforms } from "./api";
import ImageComponent from "../component/ImageComponent";
import { useNavigate } from "react-router-dom";

const Home: React.FC = () => {
    const navigate = useNavigate();
    const GAMES_PER_PAGE = 12;

    // State definitions
    const [games, setGames] = useState<Game[]>([]);
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
    const [useHybridSearch] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);

    // New state for end-of-pages alert
    const [showEndAlert, setShowEndAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState("");

    // Entity mappings
    const [entityMaps, setEntityMaps] = useState({
        category: {} as Record<string, string>,
        platform: {} as Record<string, string>,
        tag: {} as Record<string, string>,
    });

    // Helper functions
    const createEntityMap = <T extends { id: number; name: string }>(
        entities: T[]
    ): Record<string, string> => {
        const mapping: Record<string, string> = {};
        entities.forEach((entity) => {
            mapping[entity.id.toString()] = entity.name;
        });
        return mapping;
    };

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
            const gamesData = await fetchArticles({
                limit: GAMES_PER_PAGE,
                offset,
                query: searchTerm,
                categories: selectedCategories.length > 0 ? selectedCategories : null,
                platforms: selectedPlatforms.length > 0 ? selectedPlatforms : null,
                tags: selectedTags.length > 0 ? selectedTags : null,
                sort: ["updatedAt:desc"],
                useHybridSearch,
            });

            // Check if we're trying to go to a page with no data
            if (gamesData.length === 0 && pageNumber > 1) {
                // If no games found and we're not on the first page, show alert and go back
                setAlertMessage("อุ้ยดูเหมือนจะหมดแล้วนะ");
                setShowEndAlert(true);
                // Auto-hide alert after 3 seconds
                setTimeout(() => setShowEndAlert(false), 3000);
                return false; // Indicate that we hit the end
            }

            setGames(gamesData);
            setTotalGames(
                gamesData.length < GAMES_PER_PAGE
                    ? pageNumber * GAMES_PER_PAGE - (GAMES_PER_PAGE - gamesData.length)
                    : (pageNumber + 1) * GAMES_PER_PAGE
            );

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
                setEntityMaps({
                    category: createEntityMap(categoriesData),
                    platform: createEntityMap(platformsData),
                    tag: createEntityMap(tagsData),
                });
                const gamesData = await fetchArticles({ limit: GAMES_PER_PAGE });
                setGames(gamesData);
                setTotalGames(
                    gamesData.length < GAMES_PER_PAGE
                        ? gamesData.length
                        : GAMES_PER_PAGE * 2
                );
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

    // Enhanced skeleton loader with shimmer effect
    const renderSkeletonCard = () => (
        <div className="card bg-gradient-to-br from-base-100 to-base-200/50 shadow-xl border border-base-300/20">
            <div className="h-56 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-t-lg animate-pulse bg-[length:200%_100%] animate-shimmer"></div>
            <div className="card-body p-6">
                <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg w-3/4 mb-3 animate-pulse bg-[length:200%_100%] animate-shimmer"></div>
                <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-1/2 mb-4 animate-pulse bg-[length:200%_100%] animate-shimmer"></div>
                <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-full mb-2 animate-pulse bg-[length:200%_100%] animate-shimmer"></div>
                <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-5/6 mb-4 animate-pulse bg-[length:200%_100%] animate-shimmer"></div>
                <div className="flex gap-2">
                    <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full w-16 animate-pulse bg-[length:200%_100%] animate-shimmer"></div>
                    <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full w-16 animate-pulse bg-[length:200%_100%] animate-shimmer"></div>
                </div>
            </div>
        </div>
    );

    // Enhanced end-of-pages alert with glassmorphism
    const renderEndAlert = () => {
        if (!showEndAlert) return null;

        return (
            <div className="fixed top-4 right-4 z-50 animate-[slideIn_0.3s_ease-out,bounce_0.5s_ease-out_0.3s]">
                <div className="alert bg-gradient-to-r from-orange-500/90 to-yellow-500/90 backdrop-blur-md border border-orange-300/30 shadow-2xl max-w-sm text-white">
                    <AlertCircle size={20} className="animate-pulse" />
                    <span className="text-sm font-medium">{alertMessage}</span>
                    <button
                        className="btn btn-ghost btn-xs text-white hover:bg-white/20 transition-all duration-200"
                        onClick={() => setShowEndAlert(false)}
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        );
    };

    // Enhanced filter modal with glassmorphism
    const renderFilterModal = () => (
        <div
            className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-center md:items-start md:mt-16 transition-all duration-300 ${
                showFilterModal ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
        >
            <div
                className={`bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto border border-white/30 shadow-2xl transition-all duration-300 ${
                    showFilterModal ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
                }`}
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent flex items-center gap-2">
                        <Filter size={24} />
                        Filters
                    </h2>
                    <button
                        onClick={() => setShowFilterModal(false)}
                        className="btn btn-circle btn-ghost hover:bg-white/20 transition-all duration-200"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-8">
                    <div className="filter-section">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                            Categories
                        </h3>
                        <div className="space-y-2">
                            {categories.map((item) => (
                                <div key={item.id} className="form-control">
                                    <label className="cursor-pointer label justify-start gap-3 hover:bg-white/10 rounded-lg p-2 transition-all duration-200">
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-primary checkbox-sm"
                                            checked={selectedCategories.includes(item.id.toString())}
                                            onChange={() => toggleFilter(item.id.toString(), setSelectedCategories)}
                                        />
                                        <span className="label-text font-medium">{item.name}</span>
                                        {item.articleCount && (
                                            <span className="badge badge-primary badge-sm ml-auto">{item.articleCount}</span>
                                        )}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="filter-section">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
                            Platforms
                        </h3>
                        <div className="space-y-2">
                            {platforms.map((item) => (
                                <div key={item.id} className="form-control">
                                    <label className="cursor-pointer label justify-start gap-3 hover:bg-white/10 rounded-lg p-2 transition-all duration-200">
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-secondary checkbox-sm"
                                            checked={selectedPlatforms.includes(item.id.toString())}
                                            onChange={() => toggleFilter(item.id.toString(), setSelectedPlatforms)}
                                        />
                                        <span className="label-text font-medium">{item.name}</span>
                                        {item.articleCount && (
                                            <span className="badge badge-secondary badge-sm ml-auto">{item.articleCount}</span>
                                        )}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="filter-section">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                            Tags
                        </h3>
                        <div className="space-y-2">
                            {tags.map((item) => (
                                <div key={item.id} className="form-control">
                                    <label className="cursor-pointer label justify-start gap-3 hover:bg-white/10 rounded-lg p-2 transition-all duration-200">
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-accent checkbox-sm"
                                            checked={selectedTags.includes(item.id.toString())}
                                            onChange={() => toggleFilter(item.id.toString(), setSelectedTags)}
                                        />
                                        <span className="label-text font-medium">{item.name}</span>
                                        {item.articleCount && (
                                            <span className="badge badge-accent badge-sm ml-auto">{item.articleCount}</span>
                                        )}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-between mt-6 pt-6 border-t border-white/20">
                        <button
                            type="button"
                            className="btn btn-ghost hover:bg-white/20 transition-all duration-200"
                            onClick={clearAllFilters}
                        >
                            Clear All
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary bg-gradient-to-r from-primary to-primary-focus hover:from-primary-focus hover:to-primary transition-all duration-200"
                            onClick={() => setShowFilterModal(false)}
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    // Enhanced active filters with better styling
    const renderActiveFilters = () => {
        const hasActiveFilters =
            selectedCategories.length > 0 ||
            selectedPlatforms.length > 0 ||
            selectedTags.length > 0;

        if (!hasActiveFilters) return null;

        return (
            <div className="mt-6 p-4 bg-gradient-to-r from-base-200/50 to-base-300/30 rounded-xl border border-base-300/30">
                <h4 className="text-sm font-semibold mb-3 text-base-content/70">Active Filters:</h4>
                <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
                    {selectedCategories.map((catId) => (
                        <span
                            key={catId}
                            className="badge badge-primary badge-lg gap-2 hover:badge-primary-focus transition-all duration-200 cursor-pointer"
                        >
                            {entityMaps.category[catId] || catId}
                            <button
                                onClick={() => toggleFilter(catId, setSelectedCategories)}
                                type="button"
                                className="hover:text-primary-content/80 transition-colors duration-200"
                            >
                                <X size={14} />
                            </button>
                        </span>
                    ))}
                    {selectedPlatforms.map((platformId) => (
                        <span
                            key={platformId}
                            className="badge badge-secondary badge-lg gap-2 hover:badge-secondary-focus transition-all duration-200 cursor-pointer"
                        >
                            {entityMaps.platform[platformId] || platformId}
                            <button
                                onClick={() => toggleFilter(platformId, setSelectedPlatforms)}
                                type="button"
                                className="hover:text-secondary-content/80 transition-colors duration-200"
                            >
                                <X size={14} />
                            </button>
                        </span>
                    ))}
                    {selectedTags.map((tagId) => (
                        <span
                            key={tagId}
                            className="badge badge-accent badge-lg gap-2 hover:badge-accent-focus transition-all duration-200 cursor-pointer"
                        >
                            {entityMaps.tag[tagId] || tagId}
                            <button
                                onClick={() => toggleFilter(tagId, setSelectedTags)}
                                type="button"
                                className="hover:text-accent-content/80 transition-colors duration-200"
                            >
                                <X size={14} />
                            </button>
                        </span>
                    ))}
                </div>
            </div>
        );
    };

    // Enhanced pagination with modern styling
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
                <div className="join shadow-lg bg-base-100 rounded-xl border border-base-300/30">
                    <button
                        className="join-item btn btn-md hover:btn-primary transition-all duration-200"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                        aria-label="Previous page"
                    >
                        «
                    </button>
                    {getPageNumbers().map((page) => (
                        <button
                            key={page}
                            className={`join-item btn btn-md transition-all duration-200 ${
                                currentPage === page
                                    ? "btn-primary bg-gradient-to-r from-primary to-primary-focus"
                                    : "hover:btn-primary hover:bg-gradient-to-r hover:from-primary/20 hover:to-primary-focus/20"
                            }`}
                            onClick={() => handlePageClick(page)}
                            aria-label={`Page ${page}`}
                        >
                            {page}
                        </button>
                    ))}
                    <button
                        className="join-item btn btn-md hover:btn-primary transition-all duration-200"
                        onClick={handleNextPage}
                        disabled={games.length < GAMES_PER_PAGE}
                        aria-label="Next page"
                    >
                        »
                    </button>
                </div>
            </div>
        );
    };

    // Enhanced game card with modern styling and animations
    const renderGameCard = (game: Game) => {
        const isNew = new Date().getTime() - new Date(game.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;

        return (
            <div
                key={game.id}
                className="card bg-gradient-to-br from-base-100 to-base-200/50 shadow-xl border border-base-300/20 hover:shadow-2xl hover:border-primary/30 transition-all duration-500 transform hover:-translate-y-2 hover:scale-[1.02] group"
            >
                <figure className="h-48 relative overflow-hidden">
                    {game.mainImage ? (
                        <ImageComponent
                            src={game.mainImage}
                            alt={game.title}
                            quality={100}
                            className="w-full h-full object-cover rounded-t-lg transition-all duration-500 group-hover:scale-110"
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center rounded-t-lg">
                            <span className="text-gray-500 font-medium">No Image Available</span>
                        </div>
                    )}

                    {/* Enhanced overlay with gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                    {/* New game badge with sparkle animation */}
                    {isNew && (
                        <span className="absolute top-3 left-3 badge badge-primary gap-1 animate-pulse shadow-lg">
                            <Sparkles size={12} className="animate-spin" />
                            New
                        </span>
                    )}

                    {/* Trending indicator */}
                    {game.tags.length > 5 && (
                        <span className="absolute top-3 right-3 badge badge-secondary gap-1 shadow-lg">
                            <TrendingUp size={12} />
                            Hot
                        </span>
                    )}
                </figure>

                <div className="card-body p-6">
                    <h2 className="card-title text-lg font-bold bg-gradient-to-r from-base-content to-base-content/80 bg-clip-text text-transparent line-clamp-2 mb-2">
                        {game.title}
                    </h2>
                    <p className="text-sm text-primary font-medium mb-3">{formatDate(game.createdAt)}</p>
                    <p className="text-sm line-clamp-3 text-base-content/70 mb-4 leading-relaxed">
                        {game.description}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">
                        {game.tags.slice(0, 3).map((tag, index) => (
                            <span
                                key={tag.id}
                                className={`badge badge-ghost hover:badge-primary transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                                    index === 0 ? 'animate-[fadeIn_0.3s_ease-out]' :
                                        index === 1 ? 'animate-[fadeIn_0.3s_ease-out_0.1s]' :
                                            'animate-[fadeIn_0.3s_ease-out_0.2s]'
                                }`}
                                onClick={() => {
                                    if (!selectedTags.includes(tag.id.toString())) {
                                        toggleFilter(tag.id.toString(), setSelectedTags);
                                    }
                                }}
                            >
                                #{tag.name}
                            </span>
                        ))}
                        {game.tags.length > 3 && (
                            <span className="badge badge-outline animate-[fadeIn_0.3s_ease-out_0.3s]">
                                +{game.tags.length - 3} more
                            </span>
                        )}
                    </div>

                    <div className="card-actions justify-between items-center mt-auto">
                        <div className="flex items-center gap-3 group/author">
                            <div className="avatar">
                                <div className="w-8 rounded-full ring-2 ring-transparent group-hover/author:ring-primary transition-all duration-300">
                                    <img src={game.author.image} alt={game.author.name} />
                                </div>
                            </div>
                            <span className="text-sm font-medium text-base-content/80 group-hover/author:text-primary transition-colors duration-300">
                                {game.author.name}
                            </span>
                        </div>
                        <button
                            className="btn btn-primary bg-gradient-to-r from-primary to-primary-focus hover:from-primary-focus hover:to-primary btn-sm px-6 transition-all duration-300 hover:shadow-lg hover:scale-105"
                            onClick={() => navigateToArticle(game.slug)}
                            aria-label={`View details for ${game.title}`}
                        >
                            View
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-base-100 via-base-100 to-base-200/30">
            <div className="container mx-auto px-4 py-8">
                {/* End-of-pages alert */}
                {renderEndAlert()}

                {/* Enhanced sticky header with glassmorphism */}
                <div className="sticky top-0 z-40 bg-base-100/90 backdrop-blur-xl py-6 rounded-xl border-b border-base-300/30 shadow-lg mb-8">
                    <h1 className="text-5xl font-black mb-8 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent text-center">
                        🎮 Game Library
                    </h1>

                    <form onSubmit={handleSearch} className="flex flex-col gap-6">
                        <div className="flex flex-col md:flex-row gap-4 items-center">
                            <div className="relative flex-grow">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-primary z-10" />
                                <input
                                    type="text"
                                    placeholder="Search for games by title, genre, or platform..."
                                    className="input input-bordered input-lg pl-12 w-full bg-gradient-to-r from-base-100 to-base-200/50 backdrop-blur-sm focus:ring-4 focus:ring-primary/20 border-2 border-base-300/30 hover:border-primary/50 focus:border-primary transition-all duration-300 shadow-lg"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    aria-label="Search games"
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-base-content/50 hover:text-primary transition-all duration-200 hover:scale-110"
                                        onClick={() => setSearchTerm("")}
                                        aria-label="Clear search"
                                    >
                                        <X size={20} />
                                    </button>
                                )}
                            </div>
                            <button
                                type="submit"
                                className="btn btn-primary btn-lg bg-gradient-to-r from-primary to-primary-focus hover:from-primary-focus hover:to-primary transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 px-8"
                                aria-label="Submit search"
                            >
                                Search
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline btn-lg relative hover:btn-primary transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                                onClick={() => setShowFilterModal(true)}
                                aria-label="Open filters"
                            >
                                <Filter size={20} />
                                {(selectedCategories.length + selectedPlatforms.length + selectedTags.length) > 0 && (
                                    <span className="absolute -top-2 -right-2 badge badge-primary badge-sm animate-pulse shadow-lg">
                                        {selectedCategories.length + selectedPlatforms.length + selectedTags.length}
                                    </span>
                                )}
                            </button>
                        </div>
                        {renderActiveFilters()}
                    </form>
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
                                            className="animate-[fadeInUp_0.6s_ease-out] opacity-0 animate-fill-forwards"
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

            {/* Custom CSS for animations */}
            <style>{`
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(40px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                
                .animate-shimmer {
                    animation: shimmer 2s infinite linear;
                }
                
                .animate-fill-forwards {
                    animation-fill-mode: forwards;
                }
                
                .line-clamp-2 {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                
                .line-clamp-3 {
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                
                .filter-section {
                    position: relative;
                }
                
                .filter-section::before {
                    content: '';
                    position: absolute;
                    left: -1rem;
                    top: 0;
                    width: 3px;
                    height: 100%;
                    background: linear-gradient(to bottom, transparent, rgba(var(--p), 0.5), transparent);
                    border-radius: 2px;
                }
                
                .card:hover .card-body {
                    transform: translateY(-2px);
                    transition: transform 0.3s ease;
                }
                
                .group:hover .badge {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }
            `}</style>
        </div>
    );
};

export default Home;