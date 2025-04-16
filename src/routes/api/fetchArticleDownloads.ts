// fetchArticleDownloads.ts
export const fetchArticleDownloads = async (articleId: number): Promise<any[]> => {
    try {
        // Get token from localStorage
        const token = localStorage.getItem('chanomhub_token');

        // Prepare headers
        const headers: HeadersInit = {
            'Content-Type': 'application/json'
        };

        // Add Authorization header if token exists
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Make API request with or without authentication
        const response = await fetch(
            `https://api.chanomhub.online/api/downloads/article/${articleId}`,
            { headers }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch downloads: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching downloads:", error);
        throw error;
    }
};