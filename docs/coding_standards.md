# Coding Standard Governance

Dokumen ini mendefinisikan standar penulisan kode (coding standards) yang wajib diterapkan oleh seluruh engineer untuk menjaga maintainability, keterbacaan, dan konsistensi di seluruh codebase.

## 1. Folder Structure
Gunakan arsitektur berbasis fitur (Feature-Driven) yang memisahkan boundary secara logis:
```text
src/
  ├── app/                  # Next.js App Router UI
  ├── server/               # Backend logic
  │   ├── controllers/      # API Handlers
  │   ├── services/         # Business Logic
  │   ├── repositories/     # Database Access
  │   ├── dtos/             # Data Transfer Objects
  │   └── utils/            # Shared Utilities
```
Hindari peletakan file business logic di dalam folder komponen UI (`app/`).

## 2. Naming Convention
- **File Name**: `kebab-case.ts` (kecuali komponen UI `PascalCase.tsx`).
- **Class Name / Interface**: `PascalCase`.
- **Variable / Function Name**: `camelCase`.
- **Constant / Environment Variable**: `UPPER_SNAKE_CASE`.
- **Database Tables/Columns** (Prisma): Model `PascalCase`, field `camelCase`.

## 3. TypeScript Convention
- **No `any` Policy**: Dilarang keras menggunakan tipe `any`. Gunakan `unknown` jika tipe belum pasti dan wajib lakukan type assertion/narrowing.
- **Strict Mode**: `strict: true` pada `tsconfig.json` bersifat wajib.
- **Interfaces vs Types**: Gunakan `interface` untuk definisi struktur objek publik, dan gunakan `type` untuk union, intersection, atau tipe turunan.

## 4. API Convention (Controllers)
- Controller hanya bertugas menangani HTTP Request/Response (Parsing parameter, header, body).
- Segala logic bisnis HARUS didelegasikan ke layer Service.
- API REST harus mengadopsi standar respon terpusat (`{ status, message, data, errors }`).

## 5. DTO Convention
- Data Transfer Object (DTO) wajib menggunakan validasi skema (contoh: Zod atau Joi).
- Type TypeScript harus di-infer langsung dari skema DTO (`z.infer<typeof Schema>`) untuk menjamin konsistensi.

## 6. Service Convention
- Service adalah satu-satunya layer yang boleh mengandung **Business Logic**.
- Service tidak boleh bergantung pada Controller, Next.js Request, atau Express Request.
- Service diperbolehkan memanggil Repository atau eksternal HTTP Client.

## 7. Repository Convention
- Repository bertugas murni sebagai abstraksi query database (Prisma).
- Dilarang keras mencampur aturan bisnis (validasi, perhitungan) di dalam query Repository.
- Repository dilarang memanggil komponen dari UI atau Service layer.

## 8. Error Handling Convention
- Gunakan Custom Error Class (misal: `AppError`, `ValidationError`, `NotFoundError`).
- Hindari penggunaan blok `try/catch` tanpa penanganan yang spesifik. Di tingkat API, tangkap (catch) error dengan middleware atau wrapper agar format respon error konsisten.
- Jangan me-return HTTP 500 jika error disebabkan oleh validasi klien (selalu gunakan HTTP 400).

## 9. Logging Convention
- **Dilarang** menggunakan `console.log()` polos di production.
- Gunakan library logger terstruktur (misal: Winston, Pino) agar log memiliki tingkatan (`info`, `warn`, `error`, `debug`).
- Jangan mencetak data sensitif (PII, password, secret key) ke log.

## 10. Generic Usage Policy
Penggunaan TypeScript Generics diperbolehkan, namun dibatasi untuk:
- Utility functions tingkat tinggi.
- Abstraksi base class (Base Repository, Base Response).
Hindari penggunaan generic yang terlalu kompleks hingga menyulitkan keterbacaan (*over-engineering*).

## 11. Forbidden Pattern
Pola (Anti-patterns) berikut ini **DILARANG KERAS** digunakan:
1. **Circular Dependency**: File A mengimpor File B, dan File B mengimpor File A.
2. **Fat Controller**: Menulis query Prisma atau validasi panjang langsung di handler route.
3. **Magic Numbers / Strings**: Hardcoding angka/string. Pisahkan ke dalam variabel konstan.
4. **God Object**: Class atau function yang terlalu besar, melebihi Single Responsibility Principle.
5. **Swallowing Error**: `try { ... } catch (e) { }` kosong tanpa penanganan log atau lemparan ulang error.
