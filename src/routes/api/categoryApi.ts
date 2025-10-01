// categoryApi.ts
import axios from "axios";
import { Category } from "./types";

const API_URL = "https://api.chanomhub.online/api/categories";

interface CategoriesResponse {
    categories: string[];
}

export const fetchCategories = async (): Promise<Category[]> => {
    try {
        const response = await axios.get<CategoriesResponse>(API_URL);
        return response.data.categories;
    } catch (error) {
        console.error("Error fetching categories:", error);
        return [];
    }
};