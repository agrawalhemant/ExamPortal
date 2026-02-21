import React, { useState } from 'react';
import { User, Lock, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
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
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        // Clear the field's error as the user types
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.fullName.trim()) {
            newErrors.fullName = 'Full name is required.';
        }
        if (!formData.email.trim()) {
            newErrors.email = 'Email address is required.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address.';
        }
        if (!formData.password) {
            newErrors.password = 'Password is required.';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters.';
        }
        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password.';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match.';
        }
        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError('');
        setSuccessMessage('');

        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        setErrors({});
        setLoading(true);

        try {
            const { data, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                        role: 'student'
                    }
                }
            });

            if (signUpError) throw signUpError;

            if (data.user) {
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
                    setTimeout(() => navigate('/student/login'), 1500);
                } else {
                    setSuccessMessage("Registration successful! Please check your email to verify your account before logging in.");
                    setTimeout(() => navigate('/student/login'), 3000);
                }
            } else if (data.session === null && !data.user && !signUpError) {
                setSuccessMessage("Registration successful! Please check your email to verify your account.");
            }

        } catch (err) {
            setServerError(err.message || "Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const inputClass = (field) =>
        `pl-10 w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${errors[field]
            ? 'border-red-400 focus:ring-red-200 focus:border-red-400'
            : 'border-gray-300 focus:ring-blue-200 focus:border-blue-500'
        }`;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
                <Link to="/" className="flex items-center text-gray-500 hover:text-gray-700 mb-6 transition-colors">
                    <ArrowLeft size={20} className="mr-2" /> Back to Home
                </Link>

                <h2 className="text-2xl font-bold text-gray-800 mb-1 text-center">Student Registration</h2>
                <p className="text-gray-500 text-center mb-6">Create your account to start exams</p>

                {successMessage && (
                    <div className="bg-green-50 text-green-600 p-3 rounded-md flex items-center gap-2 mb-4 text-sm border border-green-200">
                        <CheckCircle size={16} /> {successMessage}
                    </div>
                )}

                {serverError && (
                    <div className="bg-red-50 text-red-500 p-3 rounded-md mb-4 text-sm border border-red-200 text-center">
                        {serverError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    {/* Full Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-gray-400 h-5 w-5" />
                            <input
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                className={inputClass('fullName')}
                                placeholder="John Doe"
                            />
                        </div>
                        {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>}
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-gray-400 h-5 w-5" />
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={inputClass('email')}
                                placeholder="john@example.com"
                            />
                        </div>
                        {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-400 h-5 w-5" />
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className={inputClass('password')}
                                placeholder="Min. 6 characters"
                            />
                        </div>
                        {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-400 h-5 w-5" />
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className={inputClass('confirmPassword')}
                                placeholder="Confirm your password"
                            />
                        </div>
                        {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>}
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

export default StudentRegister;
