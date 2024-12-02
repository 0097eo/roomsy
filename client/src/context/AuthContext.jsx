import { createContext, useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(()=>{
        const token = localStorage.getItem('token');
        const userType = localStorage.getItem('userType')
        if (token && userType) {
            setUser({ token, userType });
        }
        setLoading(false);
    }, [])

    const login = async (username, password)=>{
        try {
            const response = await fetch('api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            })
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('token', data.access_token);
                localStorage.setItem('userType', data.user_type);
                setUser({ token: data.token, userType: data.userType });
                return true
            }else{
                throw new Error('Failed to login');
            }
        }catch(error){
            console.error(error);
            return false;
        }
    }
    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userType');
        setUser(null);
    }
    const value = {
        user,
        loading,
        login,
        logout
    }
    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}


AuthProvider.propTypes = {
    children: PropTypes.node.isRequired
}

export const useAuth = () => useContext(AuthContext)

export default AuthContext