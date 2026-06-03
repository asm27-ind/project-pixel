/* eslint-disable react-refresh/only-export-components */
import { createContext, useState } from 'react';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(() => localStorage.getItem('pixel_token'));
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('pixel_user');
        try {
            return savedUser ? JSON.parse(savedUser) : null;
        } catch {
            return null;
        }
    });
    const [loading] = useState(false);

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