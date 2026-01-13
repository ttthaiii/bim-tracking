import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  // --- เพิ่มส่วนนี้เข้าไป ---
  {
    rules: {
      // ปิดกฎที่ห้ามใช้ any ไปเลย
      "@typescript-eslint/no-explicit-any": "off", 

      // หรือถ้าอยากให้แค่เตือน แต่ไม่หยุด build ให้ใช้ "warn"
      // "@typescript-eslint/no-explicit-any": "warn",
      
      '@typescript-eslint/no-unused-vars': [
          'warn',
          {
            varsIgnorePattern: '^_', // <-- เพิ่มบรรทัดนี้
            argsIgnorePattern: '^_', // <-- และบรรทัดนี้
          },
        ],
    },
  },
];

export default eslintConfig;
