"use client";

import React from "react";
import IntroVideoLoader from "./IntroVideoLoader";

export default function AppIntroWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <IntroVideoLoader />
      {children}
    </>
  );
}
