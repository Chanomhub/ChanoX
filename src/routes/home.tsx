// home.tsx
import React, { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
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
    const [useHybridSearch, setUseHybridSearch] = useState(false);

    // UI state for dropdowns
    const [dropdownStates, setDropdownStates] = useState({
        category: false,
        platform: false,
        tag: false
    });

    // ID-to-Name mappings
    const [entityMaps, setEntityMaps] = useState({
        category: {} as Record<string, string>,
        platform: {} as Record<string, string>,
        tag: {} as Record<string, string>
    });

    // Helper function to toggle dropdowns
    const toggleDropdown = (dropdownName: 'category' | 'platform' | 'tag') => {
        setDropdownStates(prev => ({
            ...prev,
            [dropdownName]: !prev[dropdownName]
        }));
    };

    // Helper function to create ID to name mappings
    const createEntityMap = <T extends { id: number; name: string }>(
        entities: T[]
    ): Record<string, string> => {
        const mapping: Record<string, string> = {};
        entities.forEach(entity => {
            mapping[entity.id.toString()] = entity.name;
        });
        return mapping;
    };

    // Helper function to handle filter toggles
    const toggleFilter = (
        filterId: string,
        setSelectedFilters: React.Dispatch<React.SetStateAction<string[]>>
    ) => {
        setSelectedFilters(prev => {
            if (prev.includes(filterId)) {
                return prev.filter(id => id !== filterId);
            } else {
                return [...prev, filterId];
            }
        });
        setCurrentPage(1);
    };

    // Function to fetch games with current search and filter parameters
    const searchGames = async () => {
        setLoading(true);
        try {
            const offset = (currentPage - 1) * GAMES_PER_PAGE;

            const gamesData = await fetchArticles({
                limit: GAMES_PER_PAGE,
                offset,
                query: searchTerm,
                categories: selectedCategories.length > 0 ? selectedCategories : null,
                platforms: selectedPlatforms.length > 0 ? selectedPlatforms : null,
                tags: selectedTags.length > 0 ? selectedTags : null,
                sort: ["updatedAt:desc"],
                useHybridSearch
            });

            setGames(gamesData);
            setTotalGames(gamesData.length < GAMES_PER_PAGE
                ? currentPage * GAMES_PER_PAGE
                : (currentPage + 1) * GAMES_PER_PAGE);
        } catch (error) {
            console.error("Error searching games:", error);
        } finally {
            setLoading(false);
        }
    };

    // Navigate to article details page
    const navigateToArticle = (gameSlug: string) => {
        navigate(`/article/${gameSlug}`);
    };

    // Initial data load
    useEffect(() => {
        const initData = async () => {
            setLoading(true);
            try {
                // Fetch categories and create mapping
                const categoriesData = await fetchCategories();
                setCategories(categoriesData);

                // Fetch tags and create mapping
                const tagsData = await fetchTags();
                setTags(tagsData);

                // Fetch platforms and create mapping
                const platformsData = await fetchPlatforms();
                setPlatforms(platformsData);

                // Update all entity maps at once
                setEntityMaps({
                    category: createEntityMap(categoriesData),
                    platform: createEntityMap(platformsData),
                    tag: createEntityMap(tagsData)
                });

                // Initial games fetch
                const gamesData = await fetchArticles({ limit: GAMES_PER_PAGE });
                setGames(gamesData);
                setTotalGames(gamesData.length < GAMES_PER_PAGE
                    ? gamesData.length
                    : GAMES_PER_PAGE * 2);
            } catch (error) {
                console.error("Error initializing data:", error);
            } finally {
                setLoading(false);
            }
        };

        initData();
    }, []);

    // Effect to trigger search when filters or pagination changes
    useEffect(() => {
        searchGames();
    }, [selectedCategories, selectedPlatforms, selectedTags, currentPage]);

    // Handle search form submission
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1);
        searchGames();
    };

    // Format date helper
    const formatDate = (timestamp: number | string) => {
        return new Date(timestamp).toLocaleDateString();
    };

    // Clear all filters
    const clearAllFilters = () => {
        setSelectedCategories([]);
        setSelectedPlatforms([]);
        setSelectedTags([]);
        setCurrentPage(1);
    };

    // Calculate total pages
    const totalPages = Math.ceil(totalGames / GAMES_PER_PAGE);

    // Render filter dropdown component
    const renderFilterDropdown = (
        type: 'category' | 'platform' | 'tag',
        items: Category[] | Platform[] | Tag[],
        selectedItems: string[],
        toggleItem: (id: string) => void
    ) => {
        const typeLabels = {
            category: 'Categories',
            platform: 'Platforms',
            tag: 'Tags'
        };

        return (
            <div className="relative">
                <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => toggleDropdown(type)}
                >
                    {typeLabels[type]} {selectedItems.length > 0 && `(${selectedItems.length})`}
                </button>

                {dropdownStates[type] && (
                    <div className="absolute mt-2 w-64 bg-base-100 shadow-xl z-10 rounded-lg p-2 border border-base-300">
                        <div className="max-h-60 overflow-y-auto">
                            {items.map(item => (
                                <div key={item.id} className="form-control">
                                    <label className="cursor-pointer label justify-start gap-2">
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-sm"
                                            checked={selectedItems.includes(item.id.toString())}
                                            onChange={() => toggleItem(item.id.toString())}
                                        />
                                        <span className="label-text">{item.name}</span>
                                        {/* @ts-ignore - articleCount might not exist on all types */}
                                        {item.articleCount && (
                                            <span className="badge badge-sm">{item.articleCount}</span>
                                        )}
                                    </label>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-2 pt-2 border-t">
                            <button
                                type="button"
                                className="btn btn-xs btn-ghost"
                                onClick={() => {
                                    if (type === 'category') setSelectedCategories([]);
                                    if (type === 'platform') setSelectedPlatforms([]);
                                    if (type === 'tag') setSelectedTags([]);
                                }}
                            >
                                Clear
                            </button>
                            <button
                                type="button"
                                className="btn btn-xs btn-primary"
                                onClick={() => toggleDropdown(type)}
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Render active filter badges
    const renderActiveFilters = () => {
        const hasActiveFilters = selectedCategories.length > 0 ||
            selectedPlatforms.length > 0 ||
            selectedTags.length > 0;

        if (!hasActiveFilters) return null;

        return (
            <div className="flex flex-wrap gap-2 mt-2">
                {selectedCategories.map(catId => (
                    <span key={catId} className="badge badge-outline gap-2">
                        {entityMaps.category[catId] || catId}
                        <button onClick={() => toggleFilter(catId, setSelectedCategories)} type="button">
                            <X size={14} />
                        </button>
                    </span>
                ))}

                {selectedPlatforms.map(platformId => (
                    <span key={platformId} className="badge badge-outline gap-2">
                        {entityMaps.platform[platformId] || platformId}
                        <button onClick={() => toggleFilter(platformId, setSelectedPlatforms)} type="button">
                            <X size={14} />
                        </button>
                    </span>
                ))}

                {selectedTags.map(tagId => (
                    <span key={tagId} className="badge badge-outline gap-2">
                        {entityMaps.tag[tagId] || tagId}
                        <button onClick={() => toggleFilter(tagId, setSelectedTags)} type="button">
                            <X size={14} />
                        </button>
                    </span>
                ))}

                {hasActiveFilters && (
                    <button
                        type="button"
                        className="btn btn-xs btn-ghost"
                        onClick={clearAllFilters}
                    >
                        Clear all filters
                    </button>
                )}
            </div>
        );
    };

    // Render pagination component
    const renderPagination = () => {
        if (games.length === 0) return null;

        return (
            <div className="flex justify-center mt-8">
                <div className="join">
                    <button
                        className="join-item btn"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </button>

                    {[...Array(Math.min(5, totalPages))].map((_, index) => {
                        let pageNumber;

                        if (totalPages <= 5) {
                            pageNumber = index + 1;
                        } else if (currentPage <= 3) {
                            pageNumber = index + 1;
                        } else if (currentPage >= totalPages - 2) {
                            pageNumber = totalPages - 4 + index;
                        } else {
                            pageNumber = currentPage - 2 + index;
                        }

                        return (
                            <button
                                key={pageNumber}
                                className={`join-item btn ${currentPage === pageNumber ? 'btn-active' : ''}`}
                                onClick={() => setCurrentPage(pageNumber)}
                            >
                                {pageNumber}
                            </button>
                        );
                    })}

                    <button
                        className="join-item btn"
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        disabled={games.length < GAMES_PER_PAGE || currentPage >= totalPages}
                    >
                        Next
                    </button>
                </div>
            </div>
        );
    };

    // Render game card component
    const renderGameCard = (game: Game) => (
        <div key={game.id} className="card bg-base-100 shadow-xl">
            <figure className="h-56">
                {game.mainImage ? (
                    <ImageComponent
                        src={game.mainImage}
                        alt={game.title || 'Game Image'}
                        width={300}
                        height={200}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500">No Image Available</span>
                    </div>
                )}
            </figure>
            <div className="card-body">
                <h2 className="card-title truncate">{game.title}</h2>
                <p className="text-sm text-base-content/70">{formatDate(game.createdAt)}</p>
                <p className="line-clamp-2 mb-3">{game.description}</p>

                <div className="flex flex-wrap gap-2 mb-3">
                    {game.tags.slice(0, 3).map((tag) => (
                        <span
                            key={tag.id}
                            className="badge badge-ghost cursor-pointer"
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
                        <span className="badge badge-ghost">
                            +{game.tags.length - 3} more
                        </span>
                    )}
                </div>

                <div className="card-actions justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="avatar">
                            <div className="w-6 rounded-full">
                                <img
                                    src={game.author.image}
                                    alt={game.author.name}
                                />
                            </div>
                        </div>
                        <span className="text-sm">{game.author.name}</span>
                    </div>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigateToArticle(game.slug)}
                    >
                        View
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Game Library</h1>

            {/* Search and filters */}
            <form onSubmit={handleSearch} className="flex flex-col gap-4 mb-8">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search games..."
                            className="input input-bordered pl-10 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary">
                        Search
                    </button>
                </div>

                {/* Multi-select filters */}
                <div className="flex flex-wrap gap-2">
                    {/* Category filter */}
                    {renderFilterDropdown(
                        'category',
                        categories,
                        selectedCategories,
                        (id) => toggleFilter(id, setSelectedCategories)
                    )}

                    {/* Platform filter */}
                    {renderFilterDropdown(
                        'platform',
                        platforms,
                        selectedPlatforms,
                        (id) => toggleFilter(id, setSelectedPlatforms)
                    )}

                    {/* Tags filter */}
                    {renderFilterDropdown(
                        'tag',
                        tags,
                        selectedTags,
                        (id) => toggleFilter(id, setSelectedTags)
                    )}

                    {/* Hybrid search toggle */}
                    <div className="form-control">
                        <label className="cursor-pointer label justify-start gap-2">
                            <input
                                type="checkbox"
                                className="toggle toggle-primary"
                                checked={useHybridSearch}
                                onChange={() => setUseHybridSearch(!useHybridSearch)}
                            />
                            <span className="label-text">Use hybrid search (semantic + lexical)</span>
                            <div className="tooltip" data-tip="Combines traditional keyword search with semantic understanding for more relevant results">
                                <span className="text-sm text-info cursor-help">ℹ️</span>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Active filters display */}
                {renderActiveFilters()}
            </form>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <span className="loading loading-spinner loading-lg"></span>
                </div>
            ) : (
                <>
                    {games.length === 0 ? (
                        <div className="text-center py-16">
                            <h2 className="text-2xl font-semibold">No games found</h2>
                            <p className="text-base-content/70 mt-2">Try adjusting your search criteria</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {games.map(renderGameCard)}
                            </div>

                            {/* Pagination */}
                            {renderPagination()}
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default Home;