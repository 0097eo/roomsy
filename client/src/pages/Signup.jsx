import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import Footer from "../components/Footer";

const SignUpPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "client"
    });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState({
        password: false,
        confirmPassword: false
    });

    // Define available roles
    const roles = [
        { value: "client", label: "Client" },
        { value: "owner", label: "Property Owner" }
    ];

    
    const validatePassword = (password) => {
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const isLongEnough = password.length >= 8;
        return hasUpperCase && hasLowerCase && hasNumber && isLongEnough;
    };

    const validateEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError(null);
    };

    const togglePasswordVisibility = (field) => {
        setShowPassword(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        
        if (!validateEmail(formData.email)) {
            setError('Please enter a valid email address');
            return;
        }

        if (!validatePassword(formData.password)) {
            setError('Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, and one number');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email,
                    username: formData.username,
                    password: formData.password,
                    role: formData.role
                }),
            });

            const data = await response.json();

            if (response.ok) {
                sessionStorage.setItem('registrationEmail', formData.email);
                navigate('/verify');
            } else {
                setError(data.error || 'Registration failed');
            }
        } catch (err) {
            setError('Network error. Please try again later.');
            console.error('Registration error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="min-h-screen flex">
                <div className="w-1/2 bg-gray-600">
                    <img
                        src="https://images.unsplash.com/photo-1536494126589-29fadf0d7e3c?q=80&w=1936&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                        alt="Signup illustration"
                        className="object-cover h-screen w-full"
                    />
                </div>

                <div className="w-1/2 flex items-center justify-center">
                    <div className="max-w-md w-full px-6">
                        <h2 className="text-3xl font-extrabold text-center mb-6">
                            Sign Up for Roomsy
                        </h2>

                        {error && (
                            <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="username"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Username
                                </label>
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    required
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Email
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="role"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    I want to
                                </label>
                                <select
                                    id="role"
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    {roles.map(role => (
                                        <option key={role.value} value={role.value}>
                                            {role.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword.password ? "text" : "password"}
                                        id="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => togglePasswordVisibility('password')}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                                    >
                                        {showPassword.password ? (
                                            <EyeOff className="h-5 w-5" />
                                        ) : (
                                            <Eye className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="confirmPassword"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword.confirmPassword ? "text" : "password"}
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        required
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => togglePasswordVisibility('confirmPassword')}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                                    >
                                        {showPassword.confirmPassword ? (
                                            <EyeOff className="h-5 w-5" />
                                        ) : (
                                            <Eye className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Signing up...' : 'Sign Up'}
                                </button>
                            </div>
                        </form>

                        <p className="mt-4 text-center text-sm text-gray-600">
                            Already have an account?{' '}
                            <Link
                                to="/login"
                                className="font-medium text-blue-600 hover:text-blue-500"
                            >
                                Log in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
}

export default SignUpPage;