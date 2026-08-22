"use client";

import React from "react";
import IntroVideoLoader from "./IntroVideoLoader";
import PortalBackgroundPrewarmer from "./PortalBackgroundPrewarmer";
import { GSAPProvider } from "@/shared/gsap/GSAPProvider";

export default function AppIntroWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <IntroVideoLoader />
      <PortalBackgroundPrewarmer />
      <GSAPProvider>{children}</GSAPProvider>
    </>
  );
}
