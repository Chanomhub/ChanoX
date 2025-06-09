// home.tsx
import React, { useState, useEffect } from "react";
import { Search, X, Filter, AlertCircle } from "lucide-react";
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
        const day = date.getDate().toString().padStart(2, '0'); // Get day and pad with leading zero if needed
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Get month (0-based, so +1) and pad
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

    // Render skeleton loader for game cards
    const renderSkeletonCard = () => (
        <div className="card bg-base-100 shadow-xl animate-pulse">
            <div className="h-56 bg-gray-200 rounded-t-lg"></div>
            <div className="card-body">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6 mb-3"></div>
                <div className="flex gap-2">
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
            </div>
        </div>
    );

    // Render end-of-pages alert
    const renderEndAlert = () => {
        if (!showEndAlert) return null;

        return (
            <div className="fixed top-4 right-4 z-50 animate-bounce">
                <div className="alert alert-warning shadow-lg max-w-sm">
                    <AlertCircle size={20} />
                    <span className="text-sm font-medium">{alertMessage}</span>
                    <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => setShowEndAlert(false)}
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        );
    };

    // Render filter modal
    const renderFilterModal = () => (
        <div
            className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex justify-center items-center md:items-start md:mt-16 transition-all duration-300 ${
                showFilterModal ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
        >
            <div
                className="bg-white/10 backdrop-blur-lg rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto border border-white/20 shadow-lg"
                style={{ boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)' }}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Filters</h2>
                    <button onClick={() => setShowFilterModal(false)} className="btn btn-ghost btn-sm">
                        <X size={20} />
                    </button>
                </div>
                <div className="space-y-6">
                    <div>
                        <h3 className="font-semibold mb-2">Categories</h3>
                        {categories.map((item) => (
                            <div key={item.id} className="form-control">
                                <label className="cursor-pointer label justify-start gap-2">
                                    <input
                                        type="checkbox"
                                        className="checkbox checkbox-primary checkbox-sm"
                                        checked={selectedCategories.includes(item.id.toString())}
                                        onChange={() => toggleFilter(item.id.toString(), setSelectedCategories)}
                                    />
                                    <span className="label-text">{item.name}</span>
                                    {item.articleCount && (
                                        <span className="badge badge-sm badge-outline">{item.articleCount}</span>
                                    )}
                                </label>
                            </div>
                        ))}
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">Platforms</h3>
                        {platforms.map((item) => (
                            <div key={item.id} className="form-control">
                                <label className="cursor-pointer label justify-start gap-2">
                                    <input
                                        type="checkbox"
                                        className="checkbox checkbox-primary checkbox-sm"
                                        checked={selectedPlatforms.includes(item.id.toString())}
                                        onChange={() => toggleFilter(item.id.toString(), setSelectedPlatforms)}
                                    />
                                    <span className="label-text">{item.name}</span>
                                    {item.articleCount && (
                                        <span className="badge badge-sm badge-outline">{item.articleCount}</span>
                                    )}
                                </label>
                            </div>
                        ))}
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">Tags</h3>
                        {tags.map((item) => (
                            <div key={item.id} className="form-control">
                                <label className="cursor-pointer label justify-start gap-2">
                                    <input
                                        type="checkbox"
                                        className="checkbox checkbox-primary checkbox-sm"
                                        checked={selectedTags.includes(item.id.toString())}
                                        onChange={() => toggleFilter(item.id.toString(), setSelectedTags)}
                                    />
                                    <span className="label-text">{item.name}</span>
                                    {item.articleCount && (
                                        <span className="badge badge-sm badge-outline">{item.articleCount}</span>
                                    )}
                                </label>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-4 pt-4 border-t">
                        <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            onClick={clearAllFilters}
                        >
                            Clear All
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => setShowFilterModal(false)}
                        >
                            Apply
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    // Render active filters
    const renderActiveFilters = () => {
        const hasActiveFilters =
            selectedCategories.length > 0 ||
            selectedPlatforms.length > 0 ||
            selectedTags.length > 0;

        if (!hasActiveFilters) return null;

        return (
            <div className="flex flex-wrap gap-2 mt-4 overflow-x-auto pb-2">
                {selectedCategories.map((catId) => (
                    <span
                        key={catId}
                        className="badge badge-primary badge-lg gap-2"
                    >
                        {entityMaps.category[catId] || catId}
                        <button
                            onClick={() => toggleFilter(catId, setSelectedCategories)}
                            type="button"
                        >
                            <X size={14} />
                        </button>
                    </span>
                ))}
                {selectedPlatforms.map((platformId) => (
                    <span
                        key={platformId}
                        className="badge badge-secondary badge-lg gap-2"
                    >
                        {entityMaps.platform[platformId] || platformId}
                        <button
                            onClick={() => toggleFilter(platformId, setSelectedPlatforms)}
                            type="button"
                        >
                            <X size={14} />
                        </button>
                    </span>
                ))}
                {selectedTags.map((tagId) => (
                    <span
                        key={tagId}
                        className="badge badge-accent badge-lg gap-2"
                    >
                        {entityMaps.tag[tagId] || tagId}
                        <button
                            onClick={() => toggleFilter(tagId, setSelectedTags)}
                            type="button"
                        >
                            <X size={14} />
                        </button>
                    </span>
                ))}
            </div>
        );
    };

    // Enhanced pagination with smart navigation
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
            <div className="flex justify-center mt-8">
                <div className="join">
                    <button
                        className="join-item btn btn-sm"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                        aria-label="Previous page"
                    >
                        «
                    </button>
                    {getPageNumbers().map((page) => (
                        <button
                            key={page}
                            className={`join-item btn btn-sm ${currentPage === page ? "btn-active" : ""}`}
                            onClick={() => handlePageClick(page)}
                            aria-label={`Page ${page}`}
                        >
                            {page}
                        </button>
                    ))}
                    <button
                        className="join-item btn btn-sm"
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

    // Render game card
    const renderGameCard = (game: Game) => (
        <div
            key={game.id}
            className="card bg-base-100 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
        >
            <figure className="h-48 relative">
                {game.mainImage ? (
                    <ImageComponent
                        src={game.mainImage}
                        alt={game.title}
                        quality={100}
                        className="w-full h-full object-cover rounded-t-lg"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-t-lg">
                        <span className="text-gray-500">No Image Available</span>
                    </div>
                )}
                {/* New game badge */}
                {new Date().getTime() - new Date(game.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000 && (
                    <span className="absolute top-2 left-2 badge badge-primary">New</span>
                )}
            </figure>
            <div className="card-body p-4">
                <h2 className="card-title text-lg truncate">{game.title}</h2>
                <p className="text-sm text-base-content/70">{formatDate(game.createdAt)}</p>
                <p className="text-sm line-clamp-2 mb-3">{game.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                    {game.tags.slice(0, 3).map((tag) => (
                        <span
                            key={tag.id}
                            className="badge badge-ghost cursor-pointer hover:badge-primary transition-colors"
                            onClick={() => {
                                if (!selectedTags.includes(tag.id.toString())) {
                                    toggleFilter(tag.id.toString(), setSelectedTags);
                                }
                            }}
                        >
                            {tag.name}
                        </span>
                    ))}
                    {game.tags.length > 3 && (
                        <span className="badge badge-ghost">+{game.tags.length - 3}</span>
                    )}
                </div>
                <div className="card-actions justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="avatar">
                            <div className="w-6 rounded-full">
                                <img src={game.author.image} alt={game.author.name} />
                            </div>
                        </div>
                        <span className="text-sm">{game.author.name}</span>
                    </div>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigateToArticle(game.slug)}
                        aria-label={`View details for ${game.title}`}
                    >
                        View
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-8">
            {/* End-of-pages alert */}
            {renderEndAlert()}

            {/* Sticky header for search and filters */}
            <div className="sticky top-0 z-40 bg-base-100/80 backdrop-blur-md py-4">
                <h1 className="text-4xl font-bold mb-6">Game Library</h1>
                <form onSubmit={handleSearch} className="flex flex-col gap-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search for games by title, genre, or platform..."
                                className="input input-bordered input-lg pl-10 w-full bg-base-100/50 backdrop-blur-sm focus:ring-2 focus:ring-primary transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                aria-label="Search games"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    onClick={() => setSearchTerm("")}
                                    aria-label="Clear search"
                                >
                                    <X size={20} />
                                </button>
                            )}
                        </div>
                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            aria-label="Submit search"
                        >
                            Search
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline btn-lg relative"
                            onClick={() => setShowFilterModal(true)}
                            aria-label="Open filters"
                        >
                            <Filter size={20} />
                            {(selectedCategories.length + selectedPlatforms.length + selectedTags.length) > 0 && (
                                <span className="absolute -top-2 -right-2 badge badge-primary badge-sm">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <div key={i}>{renderSkeletonCard()}</div>
                    ))}
                </div>
            ) : (
                <>
                    {games.length === 0 ? (
                        <div className="text-center py-16">
                            <h2 className="text-2xl font-semibold">No games found</h2>
                            <p className="text-base-content/70 mt-2">
                                Try adjusting your search or filters to find more games.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {games.map(renderGameCard)}
                            </div>
                            {renderPagination()}
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default Home;