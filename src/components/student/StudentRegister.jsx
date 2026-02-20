import React, { useState } from 'react';
import { User, Lock, Mail, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../supabase/client';
import { Link, useNavigate } from 'react-router-dom';

const StudentRegister = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);

        try {
            // 1. Sign up with Supabase Auth
            const { data, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                        role: 'student' // helper metadata, but profile trigger is safer
                    }
                }
            });

            if (signUpError) throw signUpError;

            if (data.user) {
                // 2. Create Profile Entry
                // Note: If email confirmations are enabled in Supabase, data.session will be null here.
                // This means the client is unauthenticated, and an INSERT to the profiles table will fail RLS.
                // The best practice is to handle profile creation via a Postgres Trigger on auth.users.
                // We still attempt the upsert for systems with auto-login, but catch and ignore RLS 42501 errors gracefully.
                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: data.user.id,
                        email: formData.email,
                        full_name: formData.fullName,
                        role: 'student'
                    });

                if (profileError) {
                    console.warn("Profile insert blocked by RLS. Ensure a database trigger is set up for auth.users.", profileError.message);
                }

                if (data.session) {
                    setSuccessMessage("Registration successful! Redirecting to login...");
                    setTimeout(() => {
                        navigate('/student/login');
                    }, 1500);
                } else {
                    setSuccessMessage("Registration successful! Please check your email to verify your account before logging in.");
                    setTimeout(() => {
                        navigate('/student/login');
                    }, 3000);
                }
            } else if (data.session === null && !data.user && !signUpError) {
                setSuccessMessage("Registration successful! Please check your email to verify your account.");
            }

        } catch (err) {
            setError(err.message || "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
                <Link to="/" className="flex items-center text-gray-500 hover:text-gray-700 mb-6 transition-colors">
                    <ArrowLeft size={20} className="mr-2" /> Back to Home
                </Link>

                <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Student Registration</h2>
                <p className="text-gray-500 text-center mb-6">Create your account to start exams</p>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-md flex items-center gap-2 mb-4 text-sm">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                {successMessage && (
                    <div className="bg-green-50 text-green-600 p-3 rounded-md flex items-center gap-2 mb-4 text-sm">
                        <CheckCircle size={16} /> {successMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-gray-400 h-5 w-5" />
                            <input
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                className="pl-10 w-full p-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                placeholder="John Doe"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-gray-400 h-5 w-5" />
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="pl-10 w-full p-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                placeholder="john@example.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-400 h-5 w-5" />
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="pl-10 w-full p-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Min. 6 characters"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-400 h-5 w-5" />
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="pl-10 w-full p-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Confirm your password"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 mt-2"
                    >
                        {loading ? 'Creating Account...' : 'Register'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link to="/student/login" className="text-blue-600 hover:underline font-medium">
                        Login here
                    </Link>
                </div>
            </div>
        </div>
    );
};

// Import CheckCircle locally to avoid breaking if not imported, though I used it in JSX
// Removed duplicate import

export default StudentRegister;
