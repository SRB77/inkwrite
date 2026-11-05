import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { AlertTriangle, CheckCircle2, Info, Loader2, X } from "lucide-react";
import { AuthProvider } from "./context/AuthContext";
import { neonEnabled } from "./lib/neonAuth";
import NeonAuthGate, { NeonAuthPage } from "./components/NeonAuthGate";
import { ProtectedRoute, PublicOnlyRoute } from "./routes/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import WhiteboardPage from "./pages/WhiteboardPage";
import DemoWhiteboardPage from "./pages/DemoWhiteboardPage";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <BrowserRouter>
      <NeonAuthGate>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/demo" element={<DemoWhiteboardPage />} />

            {neonEnabled ? (
              <>
                <Route path="/login" element={<Navigate to="/auth/sign-in" replace />} />
                <Route path="/register" element={<Navigate to="/auth/sign-up" replace />} />
                {/* Unguarded so a signed-in user can actually reach sign-out. */}
                <Route path="/auth/sign-out" element={<NeonAuthPage />} />
                <Route
                  path="/auth/:pathname"
                  element={
                    <PublicOnlyRoute>
                      <NeonAuthPage />
                    </PublicOnlyRoute>
                  }
                />
              </>
            ) : (
              <>
                <Route
                  path="/login"
                  element={
                    <PublicOnlyRoute>
                      <Login />
                    </PublicOnlyRoute>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <PublicOnlyRoute>
                      <Register />
                    </PublicOnlyRoute>
                  }
                />
              </>
            )}

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/board/:boardId"
              element={
                <ProtectedRoute>
                  <WhiteboardPage />
                </ProtectedRoute>
              }
            />
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </AuthProvider>
      </NeonAuthGate>
      <Toaster
        position="bottom-center"
        gutter={10}
        toastOptions={{
          error: { duration: 500 },
          success: { duration: 1500 },
          blank: { duration: 1000 },
          loading: { duration: Infinity },
        }}
      >
        {(t) => {
          const isError = t.type === "error";
          const isSuccess = t.type === "success";
          const Icon = isError ? AlertTriangle : isSuccess ? CheckCircle2 : t.type === "loading" ? Loader2 : Info;
          const tone = isError
            ? "border-red-200 bg-red-50 text-red-800"
            : isSuccess
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-line bg-white text-ink";
          return (
            <div
              role={isError ? "alert" : "status"}
              className={`flex max-w-[min(92vw,28rem)] items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm font-medium shadow-[var(--shadow-lift)] ${tone}`}
            >
              <Icon className={`h-4.5 w-4.5 shrink-0 ${t.type === "loading" ? "animate-spin" : ""}`} />
              <span className="min-w-0 flex-1">{t.message}</span>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  toast.remove(t.id);
                }}
                aria-label="Dismiss notification"
                className="focus-ring -mr-1 grid h-6 w-6 shrink-0 place-items-center rounded-full opacity-70 transition-opacity hover:bg-black/5 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        }}
      </Toaster>
    </BrowserRouter>
  );
}
