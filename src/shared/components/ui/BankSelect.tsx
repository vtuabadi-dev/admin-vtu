"use client";

import React from "react";
import { SearchableSelect, SearchableOption } from "./SearchableSelect";

export const INDONESIAN_BANK_OPTIONS: SearchableOption[] = [
  { value: "Bank Syariah Indonesia (BSI)", label: "Bank Syariah Indonesia (BSI)", sublabel: "BSI | Syariah Indonesia" },
  { value: "Bank Mandiri", label: "Bank Mandiri", sublabel: "BMRI | Mandiri Operasional" },
  { value: "Bank Central Asia (BCA)", label: "Bank Central Asia (BCA)", sublabel: "BCA | Central Asia" },
  { value: "Bank Rakyat Indonesia (BRI)", label: "Bank Rakyat Indonesia (BRI)", sublabel: "BRI | Rakyat Indonesia" },
  { value: "Bank Negara Indonesia (BNI)", label: "Bank Negara Indonesia (BNI)", sublabel: "BNI | Negara Indonesia" },
  { value: "Bank Muamalat Indonesia", label: "Bank Muamalat Indonesia", sublabel: "BMI | Muamalat Syariah" },
  { value: "Bank Mega Syariah", label: "Bank Mega Syariah", sublabel: "BMS | Mega Syariah" },
  { value: "CIMB Niaga Syariah", label: "CIMB Niaga Syariah", sublabel: "CIMB | Niaga Syariah" },
  { value: "Bank Permata Syariah", label: "Bank Permata Syariah", sublabel: "BNLI | Permata Syariah" },
  { value: "Bank Danamon Syariah", label: "Bank Danamon Syariah", sublabel: "BDMN | Danamon Syariah" },
  { value: "Bank Tabungan Negara (BTN)", label: "Bank Tabungan Negara (BTN / BTN Syariah)", sublabel: "BTN | Tabungan Negara" },
  { value: "Bank BTPN Syariah", label: "Bank BTPN Syariah", sublabel: "BTPN | BTPN Syariah" },
  { value: "Bank Syariah Bukopin", label: "Bank Syariah Bukopin (KB Bukopin)", sublabel: "BSB | Syariah Bukopin" },
  { value: "Bank Aladin Syariah", label: "Bank Aladin Syariah", sublabel: "ALADIN | Digital Syariah" },
  { value: "Bank Jago Syariah", label: "Bank Jago / Jago Syariah", sublabel: "JAGO | Digital Jago" },
  { value: "Bank Neo Commerce (BNC)", label: "Bank Neo Commerce (BNC)", sublabel: "BNC | Digital Neo" },
  { value: "SeaBank Indonesia", label: "SeaBank Indonesia", sublabel: "SEABANK | Digital SeaBank" },
  { value: "Bank BCA Syariah", label: "Bank BCA Syariah", sublabel: "BCAS | BCA Syariah" },
  { value: "Bank DKI Syariah", label: "Bank DKI Syariah", sublabel: "DKI | DKI Syariah" },
  { value: "Bank BJB Syariah", label: "Bank BJB Syariah", sublabel: "BJB | BJB Syariah" },
  { value: "Bank Jatim Syariah", label: "Bank Jatim Syariah", sublabel: "JATIM | Jatim Syariah" },
  { value: "Bank Jateng Syariah", label: "Bank Jateng Syariah", sublabel: "JATENG | Jateng Syariah" },
  { value: "Bank Sumut Syariah", label: "Bank Sumut Syariah", sublabel: "SUMUT | Sumut Syariah" },
  { value: "Bank Riau Kepri Syariah", label: "Bank Riau Kepri Syariah", sublabel: "BRK | Riau Kepri Syariah" },
  { value: "Bank Nagari Syariah", label: "Bank Nagari Syariah", sublabel: "NAGARI | Nagari Syariah" },
  { value: "Bank Sinarmas Syariah", label: "Bank Sinarmas Syariah", sublabel: "BSIM | Sinarmas Syariah" },
  { value: "Bank Panin Dubai Syariah", label: "Bank Panin Dubai Syariah", sublabel: "PNBN | Panin Dubai" },
];

export interface BankSelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
  id?: string;
}

export function BankSelect({
  value,
  onChange,
  placeholder = "Cari / Pilih Nama Bank...",
  disabled = false,
  className,
  size = "md",
  id,
}: BankSelectProps) {
  return (
    <SearchableSelect
      id={id}
      options={INDONESIAN_BANK_OPTIONS}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      size={size}
      allowCustomText={true}
    />
  );
}
