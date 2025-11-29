import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { PermissionScope } from "@/lib/auth/roles";
import { useTranslations } from "next-intl";

interface FeatureGateProps {
  /**
   * The permission scope required to access this feature
   */
  permission: PermissionScope;
  /**
   * Optional fallback UI to show when user lacks permission
   */
  fallback?: ReactNode;
  /**
   * The protected content
   */
  children: ReactNode;
}

export default function FeatureGate({
  permission,
  fallback,
  children,
}: FeatureGateProps) {
  const { hasPermission, role } = useAuth();
  const t = useTranslations("common");

  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  const defaultFallback = (
    <div className="bg-yellow-50 text-yellow-900 p-3 text-sm rounded shadow-sm mx-4 my-2">
      ⚠️{" "}
      {t("featureGate.noPermission", {
        role: role?.toLowerCase() ?? "user",
        feature: t(`auth.permissions.${permission.split(":")[0]}`),
      })}
      {fallback && <div className="mt-2">{fallback}</div>}
    </div>
  );

  return fallback || defaultFallback;
}
