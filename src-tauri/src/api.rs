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
pub struct ArticlesResponse {
    pub articles: Vec<Article>,
    #[serde(rename = "articlesCount")]
    pub articles_count: u32,
}



#[tauri::command]
pub async fn get_articles(
    token: Option<String>,
    limit: Option<u32>,
    offset: Option<u32>,
    query: Option<String>,
    categories: Option<String>,
    platforms: Option<String>,
    tags: Option<String>,
    sort: Option<String>,
) -> Result<Vec<Article>, String> {
    let client = Client::new();
    let mut url = url::Url::parse("https://api.chanomhub.online/api/articles").map_err(|e| e.to_string())?;

    if let Some(limit_val) = limit { url.query_pairs_mut().append_pair("limit", &limit_val.to_string()); }
    if let Some(offset_val) = offset { url.query_pairs_mut().append_pair("offset", &offset_val.to_string()); }
    if let Some(query_val) = query { url.query_pairs_mut().append_pair("query", &query_val); }
    if let Some(categories_val) = categories { url.query_pairs_mut().append_pair("category", &categories_val); }
    if let Some(platforms_val) = platforms { url.query_pairs_mut().append_pair("platform", &platforms_val); }
    if let Some(tags_val) = tags { url.query_pairs_mut().append_pair("tag", &tags_val); }
    if let Some(sort_val) = sort { url.query_pairs_mut().append_pair("sort", &sort_val); }

    let mut request = client.get(url.as_str())
        .header("accept", "application/json");

    if let Some(token) = token {
        request = request.header("Authorization", format!("Bearer {}", token));
    }

    let response = request.send().await.map_err(|e| e.to_string())?;
    let status = response.status();
    
    println!("API Response Status: {}", status);

    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "<failed to read response text>".to_string());
        println!("API Error Response Body: {}", error_text);
        return Err(format!("Failed to fetch articles: {} - {}", status, error_text));
    }

    let articles_response = response.json::<ArticlesResponse>().await.map_err(|e| e.to_string())?;
    println!("Successfully parsed {} articles.", articles_response.articles.len());
    Ok(articles_response.articles)
}
