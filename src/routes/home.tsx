// home.tsx
import React, { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Game, Category, Tag, Platform, fetchArticles, fetchCategories, fetchTags, fetchPlatforms } from "./api";
import ImageComponent from "../component/ImageComponent";
import { useNavigate } from "react-router-dom";

const Home: React.FC = () => {
    const navigate = useNavigate();

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
    const [gamesPerPage] = useState<number>(12);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
    const [showTagDropdown, setShowTagDropdown] = useState(false);
    const [useHybridSearch, setUseHybridSearch] = useState(false);

    // Maps to store ID-to-Name mappings for display purposes
    const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
    const [platformMap, setPlatformMap] = useState<Record<string, string>>({});
    const [tagMap, setTagMap] = useState<Record<string, string>>({});

    // Function to fetch games with current search and filter parameters
    const searchGames = async () => {
        setLoading(true);
        try {
            const offset = (currentPage - 1) * gamesPerPage;

            const gamesData = await fetchArticles({
                limit: gamesPerPage,
                offset: offset,
                query: searchTerm,
                categories: selectedCategories.length > 0 ? selectedCategories : null,
                platforms: selectedPlatforms.length > 0 ? selectedPlatforms : null,
                tags: selectedTags.length > 0 ? selectedTags : null,
                sort: ["updatedAt:desc"],
                useHybridSearch: useHybridSearch
            });

            setGames(gamesData);
            setTotalGames(gamesData.length < gamesPerPage ? currentPage * gamesPerPage : (currentPage + 1) * gamesPerPage);
        } catch (error) {
            console.error("Error searching games:", error);
        } finally {
            setLoading(false);
        }
    };

    // Function to fetch article details and its downloads
    const navigateToArticle = (gameSlug: string) => {
        navigate(`/article/${gameSlug}`);
    };

    // Initial data load
    useEffect(() => {
        const initData = async () => {
            setLoading(true);
            try {
                const categoryMapping: Record<string, string> = {};
                const tagMapping: Record<string, string> = {};
                const platformMapping: Record<string, string> = {};

                const categoriesData = await fetchCategories();
                setCategories(categoriesData);
                categoriesData.forEach(cat => {
                    categoryMapping[cat.id.toString()] = cat.name;
                });
                setCategoryMap(categoryMapping);

                const tagsData = await fetchTags();
                setTags(tagsData);
                tagsData.forEach(tag => {
                    tagMapping[tag.id.toString()] = tag.name;
                });
                setTagMap(tagMapping);

                const platformsData = await fetchPlatforms();
                setPlatforms(platformsData);
                platformsData.forEach(platform => {
                    platformMapping[platform.id.toString()] = platform.name;
                });
                setPlatformMap(platformMapping);

                const gamesData = await fetchArticles({ limit: gamesPerPage });
                setGames(gamesData);
                setTotalGames(gamesData.length < gamesPerPage ? gamesData.length : gamesPerPage * 2);

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

    // Toggle category selection
    const toggleCategory = (categoryId: string) => {
        setSelectedCategories(prev => {
            if (prev.includes(categoryId)) {
                return prev.filter(id => id !== categoryId);
            } else {
                return [...prev, categoryId];
            }
        });
        setCurrentPage(1);
    };

    // Toggle platform selection
    const togglePlatform = (platformId: string) => {
        setSelectedPlatforms(prev => {
            if (prev.includes(platformId)) {
                return prev.filter(id => id !== platformId);
            } else {
                return [...prev, platformId];
            }
        });
        setCurrentPage(1);
    };

    // Toggle tag selection
    const toggleTag = (tagId: string) => {
        setSelectedTags(prev => {
            if (prev.includes(tagId)) {
                return prev.filter(id => id !== tagId);
            } else {
                return [...prev, tagId];
            }
        });
        setCurrentPage(1);
    };

    const formatDate = (timestamp: number | string) => {
        return new Date(timestamp).toLocaleDateString();
    };

    // Calculate total pages
    const totalPages = Math.ceil(totalGames / gamesPerPage);

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
                    <div className="relative">
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                        >
                            Categories {selectedCategories.length > 0 && `(${selectedCategories.length})`}
                        </button>

                        {showCategoryDropdown && (
                            <div className="absolute mt-2 w-64 bg-base-100 shadow-xl z-10 rounded-lg p-2 border border-base-300">
                                <div className="max-h-60 overflow-y-auto">
                                    {categories.map(category => (
                                        <div key={category.id} className="form-control">
                                            <label className="cursor-pointer label justify-start gap-2">
                                                <input
                                                    type="checkbox"
                                                    className="checkbox checkbox-sm"
                                                    checked={selectedCategories.includes(category.id.toString())}
                                                    onChange={() => toggleCategory(category.id.toString())}
                                                />
                                                <span className="label-text">{category.name}</span>
                                                {category.articleCount && (
                                                    <span className="badge badge-sm">{category.articleCount}</span>
                                                )}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between mt-2 pt-2 border-t">
                                    <button
                                        type="button"
                                        className="btn btn-xs btn-ghost"
                                        onClick={() => setSelectedCategories([])}
                                    >
                                        Clear
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-xs btn-primary"
                                        onClick={() => setShowCategoryDropdown(false)}
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Platform filter */}
                    <div className="relative">
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => setShowPlatformDropdown(!showPlatformDropdown)}
                        >
                            Platforms {selectedPlatforms.length > 0 && `(${selectedPlatforms.length})`}
                        </button>

                        {showPlatformDropdown && (
                            <div className="absolute mt-2 w-64 bg-base-100 shadow-xl z-10 rounded-lg p-2 border border-base-300">
                                <div className="max-h-60 overflow-y-auto">
                                    {platforms.map(platform => (
                                        <div key={platform.id} className="form-control">
                                            <label className="cursor-pointer label justify-start gap-2">
                                                <input
                                                    type="checkbox"
                                                    className="checkbox checkbox-sm"
                                                    checked={selectedPlatforms.includes(platform.id.toString())}
                                                    onChange={() => togglePlatform(platform.id.toString())}
                                                />
                                                <span className="label-text">{platform.name}</span>
                                                {platform.articleCount && (
                                                    <span className="badge badge-sm">{platform.articleCount}</span>
                                                )}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between mt-2 pt-2 border-t">
                                    <button
                                        type="button"
                                        className="btn btn-xs btn-ghost"
                                        onClick={() => setSelectedPlatforms([])}
                                    >
                                        Clear
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-xs btn-primary"
                                        onClick={() => setShowPlatformDropdown(false)}
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tags filter */}
                    <div className="relative">
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => setShowTagDropdown(!showTagDropdown)}
                        >
                            Tags {selectedTags.length > 0 && `(${selectedTags.length})`}
                        </button>

                        {showTagDropdown && (
                            <div className="absolute mt-2 w-64 bg-base-100 shadow-xl z-10 rounded-lg p-2 border border-base-300">
                                <div className="max-h-60 overflow-y-auto">
                                    {tags.map(tag => (
                                        <div key={tag.id} className="form-control">
                                            <label className="cursor-pointer label justify-start gap-2">
                                                <input
                                                    type="checkbox"
                                                    className="checkbox checkbox-sm"
                                                    checked={selectedTags.includes(tag.id.toString())}
                                                    onChange={() => toggleTag(tag.id.toString())}
                                                />
                                                <span className="label-text">{tag.name}</span>
                                                {tag.articleCount && (
                                                    <span className="badge badge-sm">{tag.articleCount}</span>
                                                )}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between mt-2 pt-2 border-t">
                                    <button
                                        type="button"
                                        className="btn btn-xs btn-ghost"
                                        onClick={() => setSelectedTags([])}
                                    >
                                        Clear
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-xs btn-primary"
                                        onClick={() => setShowTagDropdown(false)}
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
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
                {(selectedCategories.length > 0 || selectedPlatforms.length > 0 || selectedTags.length > 0) && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {selectedCategories.map(catId => (
                            <span key={catId} className="badge badge-outline gap-2">
                                {categoryMap[catId] || catId}
                                <button onClick={() => toggleCategory(catId)} type="button">
                                    <X size={14} />
                                </button>
                            </span>
                        ))}

                        {selectedPlatforms.map(platformId => (
                            <span key={platformId} className="badge badge-outline gap-2">
                                {platformMap[platformId] || platformId}
                                <button onClick={() => togglePlatform(platformId)} type="button">
                                    <X size={14} />
                                </button>
                            </span>
                        ))}

                        {selectedTags.map(tagId => (
                            <span key={tagId} className="badge badge-outline gap-2">
                                {tagMap[tagId] || tagId}
                                <button onClick={() => toggleTag(tagId)} type="button">
                                    <X size={14} />
                                </button>
                            </span>
                        ))}

                        {(selectedCategories.length > 0 || selectedPlatforms.length > 0 || selectedTags.length > 0) && (
                            <button
                                type="button"
                                className="btn btn-xs btn-ghost"
                                onClick={() => {
                                    setSelectedCategories([]);
                                    setSelectedPlatforms([]);
                                    setSelectedTags([]);
                                    setCurrentPage(1);
                                }}
                            >
                                Clear all filters
                            </button>
                        )}
                    </div>
                )}
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
                                {games.map((game) => (
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
                                                                toggleTag(tag.id.toString());
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
                                ))}
                            </div>

                            {/* Pagination */}
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
                                        disabled={games.length < gamesPerPage || currentPage >= totalPages}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default Home;