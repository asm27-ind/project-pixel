import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('pixel_token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedUser = localStorage.getItem('pixel_user');
        if (token && savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, [token]);

    const loginSession = (sessionToken, userData) => {
        localStorage.setItem('pixel_token', sessionToken);
        localStorage.setItem('pixel_user', JSON.stringify(userData));
        setToken(sessionToken);
        setUser(userData);
    };

    const logoutSession = () => {
        localStorage.removeItem('pixel_token');
        localStorage.removeItem('pixel_user');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, loginSession, logoutSession }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};