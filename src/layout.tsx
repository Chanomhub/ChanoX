import { Outlet, Link, useLocation } from "react-router-dom";
import {
    AiOutlineSetting,
    AiOutlineHome,
    AiOutlineAppstore,
    AiOutlineDownload,
    AiOutlineEdit,
} from "react-icons/ai";
import clsx from "clsx";
export default function Layout() {
    const location = useLocation();
    const selectedClass = "text-primary";
    const defaultClass = "w-10 h-7";
    const linkClass = "hover:text-primary w-10 h-10";
    const gamesClass = "hover:text-primary w-10 h-10";
    const createarticleClass = "hover:text-primary w-10 h-10";
    const downloadsClass = "hover:text-primary w-10 h-10";
    const pluginClass = "hover:text-primary w-10 h-10";
    return (
        <div className="flex flex-row min-w-screen min-h-screen overflow-hidden">
            <div className="fixed top-0 left-0 bottom-0 w-14 bg-base-200 flex flex-col gap-3 px-2 pt-3">
                <Link className={linkClass} to="/">
                    <AiOutlineHome
                        className={clsx(defaultClass, {
                            [selectedClass]: location.pathname === "/",
                        })}
                    />
                </Link>
                <Link className={gamesClass} to="/games">
                    <AiOutlineAppstore
                        className={clsx(defaultClass, {
                            [selectedClass]: location.pathname === "/games",
                        })}
                    />
                </Link>
                <div className="flex-grow" />
                <Link className={pluginClass} to="/plugins">
                    <AiOutlineAppstore
                        className={clsx(defaultClass, {
                            [selectedClass]: location.pathname === "/plugins",
                        })}
                    />
                </Link>
                <Link className={downloadsClass} to="/downloads">
                    <AiOutlineDownload
                        className={clsx(defaultClass, {
                            [selectedClass]: location.pathname === "/downloads",
                        })}
                    />
                </Link>
                <Link className={createarticleClass} to="/createarticle">
                    <AiOutlineEdit
                        className={clsx(defaultClass, {
                            [selectedClass]: location.pathname === "/createarticle",
                        })}
                    />
                </Link>
                <Link className={linkClass} to="/settings">
                    <AiOutlineSetting
                        className={clsx(defaultClass, {
                            [selectedClass]: location.pathname === "/settings",
                        })}
                    />
                </Link>
            </div>
            {/* เพิ่ม margin-left เพื่อเว้นระยะจากแถบด้านข้าง */}
            <div className="ml-14 w-full h-screen overflow-y-auto">
                <Outlet />
            </div>
        </div>
    );
}
