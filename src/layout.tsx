import { Outlet, Link, useLocation } from "react-router-dom";
import {
    IconHome,
    IconApps,
    IconDownload,
    IconEdit,
    IconSettings,
    IconPuzzle, // เพิ่มไอคอนสำหรับ plugins
} from "@tabler/icons-react";
import clsx from "clsx";

export default function Layout() {
    const location = useLocation();
    const selectedClass = "text-primary";
    const defaultClass = "w-7 h-7";
    const linkClass = "hover:text-primary w-10 h-10 flex items-center justify-center";
    const gamesClass = "hover:text-primary w-10 h-10 flex items-center justify-center";
    const createarticleClass = "hover:text-primary w-10 h-10 flex items-center justify-center";
    const downloadsClass = "hover:text-primary w-10 h-10 flex items-center justify-center";
    const pluginClass = "hover:text-primary w-10 h-10 flex items-center justify-center";

    return (
        <div className="flex flex-row min-w-screen min-h-screen overflow-hidden">
            <div className="fixed top-0 left-0 bottom-0 w-14 bg-base-200 flex flex-col gap-3 px-2 pt-3">
                <Link className={linkClass} to="/">
                    <IconHome
                        className={clsx(defaultClass, {
                            [selectedClass]: location.pathname === "/",
                        })}
                    />
                </Link>
                <Link className={gamesClass} to="/games">
                    <IconApps
                        className={clsx(defaultClass, {
                            [selectedClass]: location.pathname === "/games",
                        })}
                    />
                </Link>
                <div className="flex-grow" />
                <Link className={pluginClass} to="/plugins">
                    <IconPuzzle
                        className={clsx(defaultClass, {
                            [selectedClass]: location.pathname === "/plugins",
                        })}
                    />
                </Link>
                <Link className={downloadsClass} to="/downloads">
                    <IconDownload
                        className={clsx(defaultClass, {
                            [selectedClass]: location.pathname === "/downloads",
                        })}
                    />
                </Link>
                <Link className={createarticleClass} to="/createarticle">
                    <IconEdit
                        className={clsx(defaultClass, {
                            [selectedClass]: location.pathname === "/createarticle",
                        })}
                    />
                </Link>
                <Link className={linkClass} to="/settings">
                    <IconSettings
                        className={clsx(defaultClass, {
                            [selectedClass]: location.pathname === "/settings",
                        })}
                    />
                </Link>
            </div>
            <div className="ml-14 w-full h-screen overflow-y-auto">
                <Outlet />
            </div>
        </div>
    );
}