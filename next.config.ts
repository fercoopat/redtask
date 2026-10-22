import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  devIndicators: false,
  distDir: process.env.NEXT_TEST_DIST_DIR ?? ".next",
  reactCompiler: true,
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
