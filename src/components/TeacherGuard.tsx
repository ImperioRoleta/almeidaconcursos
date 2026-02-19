import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

export default function TeacherGuard({ children }: { children: React.ReactNode }) {
    const { isAdmin, isTeacher, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Admins also have access to teacher area
    if (!isTeacher && !isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}
