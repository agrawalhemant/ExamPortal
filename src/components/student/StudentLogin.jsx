import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Lock, ArrowLeft } from 'lucide-react';

const StudentLogin = ({ onLogin, onBackToHome }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState('');
    const [loading, setLoading] = useState(false);

    const validate = () => {
        const newErrors = {};
        if (!email.trim()) {
            newErrors.email = 'Email address is required.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = 'Please enter a valid email address.';
        }
        if (!password) {
            newErrors.password = 'Password is required.';
        }
        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError('');
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        setErrors({});
        setLoading(true);
        try {
            await onLogin(email, password);
        } catch (err) {
            setServerError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = (field) =>
        `block w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${errors[field]
            ? 'border-red-400 focus:ring-red-200 focus:border-red-400'
            : 'border-gray-300 focus:ring-blue-200 focus:border-blue-500'
        }`;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
                <button
                    onClick={onBackToHome}
                    className="flex items-center text-gray-500 hover:text-gray-700 mb-6 transition-colors"
                >
                    <ArrowLeft size={20} className="mr-2" /> Back to Home
                </button>

                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Student Login</h2>

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: '' })); }}
                                className={inputClass('email')}
                                placeholder="Enter your email"
                            />
                        </div>
                        {errors.email && (
                            <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                        )}
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: '' })); }}
                                className={inputClass('password')}
                                placeholder="Enter your password"
                            />
                        </div>
                        {errors.password && (
                            <p className="mt-1 text-xs text-red-500">{errors.password}</p>
                        )}
                    </div>

                    <div className="flex items-center justify-end">
                        <Link to="/student/forgot-password" className="text-sm text-blue-600 hover:underline">
                            Forgot Password?
                        </Link>
                    </div>

                    {/* Server-side error */}
                    {serverError && (
                        <div className="text-red-500 text-sm text-center bg-red-50 border border-red-200 p-2 rounded-lg">
                            {serverError}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>

                    <div className="mt-4 text-center text-sm text-gray-600">
                        Don't have an account?{' '}
                        <Link to="/student/register" className="text-blue-600 hover:underline font-medium">
                            Register now
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StudentLogin;
