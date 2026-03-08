import { useEffect, useState } from "react";
import { getMe } from "./services/auth.api";
import { AuthContext } from "./auth.context.store";


export const AuthProvider = ({ children }) => { 

    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const bootstrapAuth = async () => {
            try {
                const data = await getMe();
                setUser(data.user);
            } catch {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        bootstrapAuth();
    }, []);


    return (
        <AuthContext.Provider value={{user,setUser,loading,setLoading}} >
            {children}
        </AuthContext.Provider>
    )

    
}
