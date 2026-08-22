"use client";

import React from "react";
import IntroVideoLoader from "./IntroVideoLoader";
import PageTransitionWrapper from "./PageTransitionWrapper";
import PortalBackgroundPrewarmer from "./PortalBackgroundPrewarmer";
import { PortalTransitionProvider } from "@/shared/context/PortalTransitionContext";

export default function AppIntroWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <IntroVideoLoader />
      <PortalBackgroundPrewarmer />
      <PortalTransitionProvider>
        <PageTransitionWrapper>{children}</PageTransitionWrapper>
      </PortalTransitionProvider>
    </>
  );
}
