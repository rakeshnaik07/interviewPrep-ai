import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:3000/api/auth",
    withCredentials: true
});

// Register
export async function register({ username, email, password }) {
    try {
        const response = await API.post("/register", {
            username,
            email,
            password
        });
        return response.data;
    } catch (err) {
        console.error(err.response?.data || err.message);
        throw err;
    }
}

// Login
export async function login({ email, password }) {
    try {
        const response = await API.post("/login", {
            email,
            password
        });
        return response.data;
    } catch (err) {
        console.error(err.response?.data || err.message);
        throw err;
    }
}

// Logout
export async function logout() {
    try {
        const response = await API.get("/logout");
        return response.data;
    } catch (err) {
        console.error(err.response?.data || err.message);
        throw err;
    }
}

// Get Current User
export async function getMe() {
    try {
        const response = await API.get("/get-me");
        return response.data;
    } catch (err) {
        console.error(err.response?.data || err.message);
        throw err;
    }
}