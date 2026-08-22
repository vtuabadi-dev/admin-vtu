"use client";

import React from "react";
import IntroVideoLoader from "./IntroVideoLoader";
import PageTransitionWrapper from "./PageTransitionWrapper";
import PortalBackgroundPrewarmer from "./PortalBackgroundPrewarmer";

export default function AppIntroWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <IntroVideoLoader />
      <PortalBackgroundPrewarmer />
      <PageTransitionWrapper>{children}</PageTransitionWrapper>
    </>
  );
}
