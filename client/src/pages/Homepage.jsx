import { Link } from "react-router-dom";

const Homepage = () => {
    return (
        <div className="min-h-screen flex">
            {/* Left Section: Hero Image */}
            <div className="w-1/2 bg-gray-600">
                <img
                    src="https://images.unsplash.com/photo-1536494126589-29fadf0d7e3c?q=80&w=1936&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                    alt="Homepage illustration"
                    className="object-cover h-screen w-full"
                />
            </div>

            {/* Right Section: Content */}
            <div className="w-1/2 flex items-center justify-center">
                <div className="max-w-md w-full px-6">
                    <h1 className="text-4xl font-extrabold text-center mb-6">
                        Welcome to Roomsy
                    </h1>

                    <p className="text-gray-700 text-center mb-6">
                        Discover, book, and manage rooms effortlessly with our
                        modern and intuitive platform.
                    </p>

                    <div className="space-y-4">
                        <Link
                            to="/signup"
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Get Started
                        </Link>

                        <Link
                            to="/login"
                            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                            Log In
                        </Link>
                    </div>

                    <div className="mt-6 text-center text-sm text-gray-600">
                        <p>
                            Need help? Visit our
                            <Link
                                to="/support"
                                className="text-blue-600 hover:text-blue-500 ml-1"
                            >
                                Support Center
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Homepage;
