import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth";
import { LOGO_SRC } from "../brand";

export const Login: React.FC = () => {
  const { auth, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") ?? "/";

  useEffect(() => {
    if (!loading && auth?.authenticated) navigate(next, { replace: true });
  }, [auth, loading, navigate, next]);

  const signIn = () => {
    window.location.href = `/api/auth/google/start?next=${encodeURIComponent(next)}`;
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        color: "#f2f2f2",
        fontFamily: "Inter, system-ui, sans-serif",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#141414",
          border: "1px solid #2a2a2a",
          borderRadius: 16,
          padding: 40,
          textAlign: "center",
        }}
      >
        <img
          src={LOGO_SRC}
          alt="Wrapped"
          width={200}
          height={56}
          style={{ maxWidth: "100%", height: "auto", marginBottom: 20 }}
        />
        <p style={{ color: "#888", marginBottom: 28 }}>
          Sign in with your <strong style={{ color: "#f2f2f2" }}>@agrim.ai</strong> account to continue.
        </p>
        <button
          onClick={signIn}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            background: "white",
            color: "#1f1f1f",
            border: "none",
            borderRadius: 10,
            padding: "14px 18px",
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          <GoogleLogo />
          Sign in with Google
        </button>
        <p style={{ color: "#666", fontSize: 12, marginTop: 24 }}>
          Other Google accounts will be rejected.
        </p>
      </div>
    </div>
  );
};

const GoogleLogo: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path
      fill="#4285F4"
      d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.614z"
    />
    <path
      fill="#34A853"
      d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
    />
    <path
      fill="#FBBC05"
      d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
    />
    <path
      fill="#EA4335"
      d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
    />
  </svg>
);
