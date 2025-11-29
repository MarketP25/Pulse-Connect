import { ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionScope } from "@/lib/auth/permissions";
import { PermissionErrorFallback } from "@/components/errors/PermissionErrorFallback";

interface PermissionGateProps {
  children: ReactNode;
  permissions: PermissionScope | PermissionScope[];
  requireAll?: boolean;
  fallback?: ReactNode;
  onPermissionDenied?: () => void;
}

export function PermissionGate({
  children,
  permissions,
  requireAll = true,
  fallback,
  onPermissionDenied,
}: PermissionGateProps) {
  const { checkPermission, checkAllPermissions, checkAnyPermission } =
    usePermissions();

  const hasAccess = Array.isArray(permissions)
    ? requireAll
      ? checkAllPermissions(permissions)
      : checkAnyPermission(permissions)
    : checkPermission(permissions);

  if (!hasAccess) {
    onPermissionDenied?.();

    const fallbackNode =
      fallback ||
      (Array.isArray(permissions) ? (
        permissions.length === 1 ? (
          <PermissionErrorFallback scope={permissions[0]} />
        ) : (
          <PermissionErrorFallback />
        )
      ) : (
        <PermissionErrorFallback scope={permissions} />
      ));

    return fallbackNode;
  }

  return <>{children}</>;
}
