import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Text documents are capped at 1 MB and PDFs at 2 MB (checked in readDocumentInput);
      // leave room for the pasted-text field and multipart overhead.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
