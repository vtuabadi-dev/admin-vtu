"use client";

import React from "react";
import GSAPIntroLoader from "./GSAPIntroLoader";
import PortalBackgroundPrewarmer from "./PortalBackgroundPrewarmer";
import { GSAPProvider } from "@/shared/gsap/GSAPProvider";

export default function AppIntroWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GSAPIntroLoader />
      <PortalBackgroundPrewarmer />
      <GSAPProvider>{children}</GSAPProvider>
    </>
  );
}
