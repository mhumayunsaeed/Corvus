import baseConfig from "@veyra/config/tailwind";
import type { Config } from "tailwindcss";

const config: Config = {
  ...baseConfig,
  content: ["./src/**/*.{ts,tsx}"],
};

export default config;
