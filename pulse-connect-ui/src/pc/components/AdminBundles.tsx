import { withPermission } from "@/lib/auth/withPermission";
import { useLanguage } from "../context/LanguageProvider";

const bundles = [
  {
    name: "Starter",
    price: 500,
    features: ["5 listings", "2 boosts", "analytics"],
  },
  {
    name: "Pro",
    price: 1500,
    features: ["Unlimited listings", "Priority support", "Custom branding"],
  },
];

const AdminBundlesComponent: React.FC = () => {
  const locale = useLanguage().lang; // Add dynamic locale support

  return (
    <div>
      <h2>{locale === "sw" ? "Vifurushi vya Biashara" : "Business Bundles"}</h2>
      {bundles.map((bundle) => (
        <div key={bundle.name}>
          <h3>
            {bundle.name}
            {locale === "sw"
              ? `KES ${bundle.price}/mwezi`
              : `KES ${bundle.price}/month`}
          </h3>
          <ul>
            {bundle.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export const AdminBundles = withPermission(AdminBundlesComponent, {
  resource: "admin",
  action: "manage",
});
