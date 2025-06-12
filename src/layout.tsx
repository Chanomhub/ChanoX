import { Outlet, Link, useLocation } from "react-router-dom";
import {
    IconHome,
    IconApps,
    IconDownload,
    IconEdit,
    IconSettings,
    IconPuzzle,
} from "@tabler/icons-react";
import clsx from "clsx";

export default function Layout() {
    const location = useLocation();

    const navigationItems = [
        { path: "/", icon: IconHome, label: "Home" },
        { path: "/games", icon: IconApps, label: "Games" },
    ];

    const bottomNavigationItems = [
        { path: "/plugins", icon: IconPuzzle, label: "Plugins" },
        { path: "/downloads", icon: IconDownload, label: "Downloads" },
        { path: "/createarticle", icon: IconEdit, label: "Create" },
        { path: "/settings", icon: IconSettings, label: "Settings" },
    ];

    const NavLink = ({ path, icon: Icon, label }: { path: string; icon: any; label: string }) => {
        const isActive = location.pathname === path;

        return (
            <Link
                className={clsx(
                    "group relative w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300 ease-out",
                    "hover:scale-110 hover:rotate-3 hover:shadow-lg hover:shadow-blue-500/25",
                    "active:scale-95 active:rotate-0",
                    isActive
                        ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30 scale-105"
                        : "bg-base-300/50 hover:bg-gradient-to-br hover:from-blue-500/10 hover:to-purple-600/10 text-base-content/70 hover:text-blue-400"
                )}
                to={path}
            >
                <Icon
                    className={clsx(
                        "w-6 h-6 transition-all duration-300",
                        "group-hover:scale-110 group-hover:drop-shadow-lg",
                        isActive ? "animate-pulse" : "group-hover:animate-bounce"
                    )}
                />

                {/* Tooltip */}
                <div className={clsx(
                    "absolute left-16 px-3 py-1.5 bg-base-100 text-base-content text-sm rounded-lg shadow-lg",
                    "opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200",
                    "border border-base-300 whitespace-nowrap z-50"
                )}>
                    {label}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-base-100 border-l border-b border-base-300 rotate-45"></div>
                </div>

                {/* Active indicator */}
                {isActive && (
                    <div className="absolute -right-1 w-1 h-8 bg-gradient-to-b from-blue-400 to-purple-500 rounded-full animate-pulse"></div>
                )}
            </Link>
        );
    };

    return (
        <div className="flex flex-row min-w-screen min-h-screen overflow-hidden bg-base-100">
            {/* Enhanced Sidebar */}
            <div className="fixed top-0 left-0 bottom-0 w-16 bg-gradient-to-b from-base-200 to-base-300 flex flex-col gap-4 px-2 py-6 shadow-xl border-r border-base-300/50">
                {/* Logo/Brand area */}
                <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg animate-pulse">
                    <div className="w-6 h-6 bg-white rounded-md"></div>
                </div>

                {/* Top Navigation */}
                <nav className="flex flex-col gap-3">
                    {navigationItems.map((item) => (
                        <NavLink key={item.path} {...item} />
                    ))}
                </nav>

                {/* Spacer */}
                <div className="flex-grow relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-0.5 bg-gradient-to-r from-transparent via-base-content/20 to-transparent"></div>
                </div>

                {/* Bottom Navigation */}
                <nav className="flex flex-col gap-3">
                    {bottomNavigationItems.map((item) => (
                        <NavLink key={item.path} {...item} />
                    ))}
                </nav>

                {/* Animated background elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 -left-4 w-8 h-8 bg-blue-500/5 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }}></div>
                    <div className="absolute top-1/2 -right-4 w-6 h-6 bg-purple-500/5 rounded-full animate-bounce" style={{ animationDelay: '1s', animationDuration: '4s' }}></div>
                    <div className="absolute bottom-1/4 -left-2 w-4 h-4 bg-blue-400/5 rounded-full animate-bounce" style={{ animationDelay: '2s', animationDuration: '5s' }}></div>
                </div>
            </div>

            {/* Main Content */}
            <div className="ml-16 w-full h-screen overflow-y-auto relative">
                {/* Animated background gradient */}
                <div className="fixed top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/5 to-purple-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }}></div>
                <div className="fixed bottom-0 left-1/3 w-64 h-64 bg-gradient-to-tr from-purple-500/5 to-pink-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s', animationDuration: '10s' }}></div>

                <div className="relative z-10">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}