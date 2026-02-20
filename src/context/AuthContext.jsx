import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase/client';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session on mount
        const getSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                if (session?.user) {
                    await fetchProfile(session.user);
                } else {
                    setLoading(false);
                }
            } catch (err) {
                console.error("Session fetch error:", err);
                setLoading(false);
            }
        };

        getSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                // Push fetchProfile to the next macrotask to ensure Supabase Auth mutex is entirely released
                setTimeout(() => {
                    fetchProfile(session.user).catch(err => {
                        console.error("Profile fetch error after auth change:", err);
                        setLoading(false);
                    });
                }, 0);
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (authUser) => {
        try {
            // Fetch additional profile data (role, name, etc.)
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching profile:', error);
            }

            setUser({
                ...authUser,
                ...profile,
                isAdmin: profile?.role === 'admin',
                isStudent: profile?.role === 'student'
            });
        } catch (error) {
            console.error("Profile fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;

        if (data.user) {
            await fetchProfile(data.user);
        }

        return data;
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    const value = {
        user,
        loading,
        login,
        logout,
        isAdmin: user?.role === 'admin',
        isStudent: user?.role === 'student'
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading ? children : <div className="flex items-center justify-center h-screen">Loading...</div>}
        </AuthContext.Provider>
    );
};
