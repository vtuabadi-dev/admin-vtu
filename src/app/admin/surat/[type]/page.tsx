"use client";

import React, { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import GenerateSuratPage from "../page";

export default function SuratTypePage() {
  const params = useParams();
  const router = useRouter();
  const type = (params?.type as string) || "rekom";

  useEffect(() => {
    if (type) {
      router.replace(`/admin/surat?type=${type}`, { scroll: false });
    }
  }, [type, router]);

  return <GenerateSuratPage />;
}
