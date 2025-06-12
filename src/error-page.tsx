import { useRouteError } from "react-router-dom";

export default function ErrorPage() {
    const error: any = useRouteError();
    console.error(error);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-black flex items-center justify-center p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-8 md:p-12 max-w-md w-full text-center transform hover:scale-[1.02] transition-all duration-300">
                <div className="mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-red-600 to-orange-500 rounded-lg flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 19c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Error</h1>
                    <div className="w-16 h-0.5 bg-gradient-to-r from-red-500 to-orange-500 mx-auto"></div>
                </div>

                <p className="text-gray-300 text-lg mb-6 leading-relaxed">
                    Sorry, an unexpected error has occurred.
                </p>

                <div className="bg-gray-900 border border-red-900 p-4 rounded-lg mb-6">
                    <p className="text-red-400 font-mono text-sm break-words">
                        {error.statusText || error.message}
                    </p>
                </div>

                <button
                    onClick={() => window.location.reload()}
                    className="bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white font-medium py-3 px-8 rounded-lg transition-all duration-200 border border-gray-600 hover:border-gray-500"
                >
                    Try Again
                </button>
            </div>
        </div>
    );
}