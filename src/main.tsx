// main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import Layout from "./layout";
import ErrorPage from "./error-page";

import Home from "./routes/home";
import CreateArticle from "./routes/CreateArticle"; // New import for article detail page
import Chat from "./routes/chat";
import Settings from "./routes/settings";
import { TauriProvider } from "./context/TauriProvider";
import "./index.css";
import { SettingsProvider } from "./context/SettingsProvider";
import ArticlePage from "./routes/article.tsx";
import Downloads from "./routes/downloads.tsx";
import PluginManager from "./routes/plugin.tsx";
import Games from "./routes/games.tsx"; // New import for games page

const router = createBrowserRouter([
    {
        path: "/",
        element: <Layout />,
        errorElement: <ErrorPage />,
        children: [
            {
                index: true,
                element: <Home />,
            },
            {
                path: "/article/:slug", // New route for article detail
                element: <ArticlePage />,
            },
            {
              path: "/games",
                element: <Games />,
            },
            {
                path: "/plugins",
                element: <PluginManager />,
            },
            {
                path: "/downloads",
                element: <Downloads />,
            },
            {
                path: "/createarticle",
                element: <CreateArticle />,
            },
            {
                path: "/chat",
                element: <Chat />,
            },

            {
                path: "/settings",
                element: <Settings />,
            },
        ],
    },
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <TauriProvider>
            <SettingsProvider>
                <RouterProvider router={router} />
            </SettingsProvider>
        </TauriProvider>
    </React.StrictMode>
);