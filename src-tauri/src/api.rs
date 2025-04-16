use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Author {
    username: String,
    bio: Option<serde_json::Value>,
    image: Option<serde_json::Value>,
    following: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Article {
    id: i32,
    title: String,
    slug: String,
    description: String,
    body: String,
    version: i32,
    #[serde(rename = "createdAt")]
    created_at: String,
    #[serde(rename = "updatedAt")]
    updated_at: String,
    status: String,
    #[serde(rename = "mainImage")]
    main_image: Option<serde_json::Value>,
    images: Vec<String>,
    #[serde(rename = "tagList")]
    tag_list: Vec<String>,
    #[serde(rename = "categoryList")]
    category_list: Vec<String>,
    #[serde(rename = "platformList")]
    platform_list: Vec<String>,
    author: Author,
    favorited: bool,
    #[serde(rename = "favoritesCount")]
    favorites_count: i32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ArticleResponse {
    article: Article,
}

pub async fn fetch_article_by_slug(slug: String, token: Option<String>) -> Result<ArticleResponse, String> {
    let client = Client::new();
    let url = format!("https://api.chanomhub.online/api/articles/{}", slug);
    let mut request = client.get(&url)
        .header("accept", "application/json");

    if let Some(token) = token {
        request = request.header("Authorization", format!("Bearer {}", token));
    }

    let response = request.send().await.map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("Failed to fetch article: {}", response.status()));
    }

    let article_response = response.json::<ArticleResponse>().await.map_err(|e| e.to_string())?;
    Ok(article_response)
}