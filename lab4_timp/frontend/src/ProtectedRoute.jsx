import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="container">Загрузка...</div>;
  }
  if (!user) {
    return <Navigate to="/login?auth=required" replace />;
  }
  return children;
}
