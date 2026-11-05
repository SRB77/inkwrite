import { Link, useNavigate, useParams } from "react-router-dom";
import { NeonAuthUIProvider, AuthView } from "@neondatabase/auth-ui";
import { authClient, neonEnabled } from "../lib/neonAuth";
import AuthLayout from "./AuthLayout";
import DemoAccessButton from "./DemoAccessButton";

// Module-level so its identity is stable across renders.
const RouterLink = ({ href, ...props }) => <Link to={href} {...props} />;

function Inner({ children }) {
  const navigate = useNavigate();
  return (
    <NeonAuthUIProvider
      authClient={authClient}
      redirectTo="/dashboard"
      basePath="/auth"
      defaultTheme="light"
      navigate={(href) => navigate(href)}
      replace={(href) => navigate(href, { replace: true })}
      Link={RouterLink}
    >
      {children}
    </NeonAuthUIProvider>
  );
}

export default function NeonAuthGate({ children }) {
  return neonEnabled ? <Inner>{children}</Inner> : children;
}

export function NeonAuthPage() {
  const { pathname } = useParams();
  return (
    <AuthLayout wide>
      <div className="flex w-full flex-col items-center">
        <AuthView path={pathname} />
        {(pathname === "sign-in" || pathname === "sign-up") && <DemoAccessButton className="mt-4 w-full max-w-sm" />}
      </div>
    </AuthLayout>
  );
}
