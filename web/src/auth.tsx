import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api, AuthInfo } from "./api";

type Ctx = {
  auth: AuthInfo | null;
  loading: boolean;
  refresh: () => Promise<void>;
};
const AuthCtx = createContext<Ctx>({ auth: null, loading: true, refresh: async () => {} });

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<AuthInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      setAuth(await api.me());
    } catch {
      setAuth({ authenticated: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return <AuthCtx.Provider value={{ auth, loading, refresh }}>{children}</AuthCtx.Provider>;
};

export const useAuth = () => useContext(AuthCtx);

export const RequireAuth: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { auth, loading } = useAuth();
  const location = useLocation();
  if (loading)
    return (
      <div style={{ padding: 60, color: "#888" }}>
        <span className="spinner" /> &nbsp; Checking sign-in…
      </div>
    );
  if (!auth?.authenticated)
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  return <>{children}</>;
};
