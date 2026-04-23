import React from "react";
import { IXAZone } from "./IXALayout";
import { Card } from "./packages/ui-components";

/**
 * IXAWorkspace Engine
 * Dynamically orchestrates the 5 zones of the Pulsco Ecosystem.
 * Integrates existing Dashboard into the 'Me' zone.
 */

// In a production scenario, these would be lazy-loaded micro-frontends
const DiscoverModule = () => (
  <div className="p-lg">
    <h2 className="text-h2 font-bold mb-md">Discover</h2>
    <Card
      elevated
      className="h-96 flex items-center justify-center border-dashed border-grid-silver"
    >
      <p className="text-grid-silver">
        Planetary Discovery Engine: Explore Places and Services near you.
      </p>
    </Card>
  </div>
);

const ShopModule = () => (
  <div className="p-lg">
    <h2 className="text-h2 font-bold mb-md">Shop</h2>
    <Card elevated className="p-xl">
      <p className="text-tech-white">Unified E-commerce Layer: Shop any product with us.</p>
    </Card>
  </div>
);

const GrowModule = () => (
  <div className="p-lg text-pulse-cyan-400">
    <h2 className="text-h2 font-bold mb-md">Grow</h2>
    <p className="text-body">We do Marketing & provide analytics of your activities in Pulsco.</p>
  </div>
);

const ConnectModule = () => (
  <div className="p-lg">
    <h2 className="text-h2 font-bold mb-md">Connect</h2>
    <p className="text-body text-stellar-purple-400">
      Real-time Matchmaking & Secure Communications.
    </p>
  </div>
);

// Wrapper for the existing legacy dashboard
const MeModule = () => (
  <div className="p-lg">
    <h2 className="text-h2 font-bold mb-md">My Pulsco</h2>
    {/* This is where the existing pulse-connect-ui/app/dashboard/page.tsx is injected */}
    <Card elevated className="bg-orbit-blue-primary/40 p-lg">
      <p className="mb-md">Welcome back. Your Planetary Journey continues....</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        <div className="h-24 bg-cosmic-slate rounded-xl animate-pulse" />
        <div className="h-24 bg-cosmic-slate rounded-xl animate-pulse" />
        <div className="h-24 bg-cosmic-slate rounded-xl animate-pulse" />
      </div>
    </Card>
  </div>
);

interface IXAWorkspaceProps {
  zone: IXAZone;
}

export const IXAWorkspace: React.FC<IXAWorkspaceProps> = ({ zone }) => {
  switch (zone) {
    case "discover":
      return <DiscoverModule />;
    case "shop":
      return <ShopModule />;
    case "grow":
      return <GrowModule />;
    case "connect":
      return <ConnectModule />;
    case "me":
      return <MeModule />;
    default:
      return <MeModule />;
  }
};
