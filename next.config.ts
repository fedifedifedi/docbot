import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Documents are capped at 1 MB (checked in readDocumentInput); leave room for the
      // pasted-text field and multipart overhead.
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
