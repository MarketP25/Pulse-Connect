import { ComponentType } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { ResourceScope, ActionType, PermissionScope } from "@/lib/auth/permissions";
import { PermissionErrorFallback } from "@/components/errors/PermissionErrorFallback";

interface WithPermissionProps {
  resource?: ResourceScope;
  action?: ActionType;
  scope?: PermissionScope;
  customFallback?: React.ReactNode;
}

export function withPermission<P extends object>(
  WrappedComponent: ComponentType<P>,
  { resource, action, scope, customFallback }: WithPermissionProps
) {
  return function PermissionGuardedComponent(props: P) {
    const { guardResource, guardScope } = usePermissions();

    if (resource && action) {
      const { hasAccess, fallback } = guardResource(
        resource,
        action,
        customFallback || <PermissionErrorFallback resource={resource} action={action} />
      );

      if (!hasAccess) return fallback;
    }

    if (scope) {
      const { hasAccess, fallback } = guardScope(
        scope,
        customFallback || <PermissionErrorFallback scope={scope} />
      );

      if (!hasAccess) return fallback;
    }

    return <WrappedComponent {...props} />;
  };
}

// Usage example:
// const ProtectedComponent = withPermission(MyComponent, {
//   resource: 'listings',
//   action: 'write'
// });
