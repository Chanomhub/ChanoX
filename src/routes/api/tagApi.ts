// tagApi.ts
import axios from "axios";
import { Tag } from "./types";

const API_URL = "https://api.chanomhub.online/api/tags";

interface TagsResponse {
    tags: string[];
}

export const fetchTags = async (): Promise<Tag[]> => {
    try {
        const response = await axios.get<TagsResponse>(API_URL);
        return response.data.tags;
    } catch (error) {
        console.error("Error fetching tags:", error);
        return [];
    }
};