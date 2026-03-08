import { useContext } from "react";
import { AuthContext } from "../auth.context.store";
import { login, register, logout, getMe } from "../services/auth.api";
export const useAuth = () => {
    const context = useContext(AuthContext);
    const { user, setUser, loading, setLoading } = context;

    // Login
    const handleLogin = async ({ email, password }) => {
        try {
            setLoading(true);
            const data = await login({ email, password });
            setUser(data.user);
            return true;
        } catch (err) {
            console.error("Login failed:", err);
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Register
    const handleRegister = async ({ username, email, password }) => {
        try {
            setLoading(true);
            const data = await register({ username, email, password });
            setUser(data.user);
        } catch (err) {
            console.error("Register failed:", err);
        } finally {
            setLoading(false);
        }
    };

    // Logout
    const handleLogout = async () => {
        try {
            await logout();
            setUser(null);
        } catch (err) {
            console.error("Logout failed:", err);
        }
    };

    // Check if user already logged in (important)
    const checkAuth = async () => {
        try {
            setLoading(true);
            const data = await getMe();
            setUser(data.user);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    return {
        user,
        loading,
        handleLogin,
        handleRegister,
        handleLogout,
        checkAuth
    };
};
