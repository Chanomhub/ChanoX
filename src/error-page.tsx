import { useRouteError } from "react-router-dom";

export default function ErrorPage() {
    const error: any = useRouteError();
    console.error(error);

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 max-w-md w-full text-center transform hover:scale-105 transition-transform duration-300">
                <div className="mb-6">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-red-400 to-pink-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-4xl">😵</span>
                    </div>
                    <h1 className="text-4xl font-bold text-gray-800 mb-2">Oops!</h1>
                    <div className="w-24 h-1 bg-gradient-to-r from-purple-400 to-pink-500 mx-auto rounded-full"></div>
                </div>

                <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                    Sorry, an unexpected error has occurred.
                </p>

                <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 p-4 rounded-lg mb-6">
                    <p className="text-red-700 italic text-sm break-words">
                        {error.statusText || error.message}
                    </p>
                </div>

                <button
                    onClick={() => window.location.reload()}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-8 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                    Try Again
                </button>
            </div>
        </div>
    );
}