import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/firebase";

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const navigate = useNavigate();

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            if (!user) navigate("/", { replace: true });  // Redirect to home if not logged in
        });

        return () => unsub();
    }, [navigate]);

    return <>{children}</>;
};

export default ProtectedRoute;
