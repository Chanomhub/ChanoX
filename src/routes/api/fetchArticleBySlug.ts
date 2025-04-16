export const fetchArticleBySlug = async (slug: string): Promise<any> => {
    try {
        const token = typeof window !== "undefined" ? localStorage.getItem("chanomhub_token") : null;

        const response = await fetch(`https://api.chanomhub.online/api/articles/${slug}`, {
            headers: token ? {
                "Authorization": `Bearer ${token}`
            } : undefined
        });

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
