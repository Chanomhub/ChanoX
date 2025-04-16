export const fetchArticleBySlug = async (slug: string): Promise<any> => {
    try {
        const response = await fetch(`https://api.chanomhub.online/api/articles/${slug}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch article: ${response.status}`);
        }
        const data = await response.json();
        return data.article;
    } catch (error) {
        console.error("Error fetching article:", error);
        throw error;
    }
};