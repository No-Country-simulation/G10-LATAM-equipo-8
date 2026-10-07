import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  preview: {
    buckets: {
      "mediflow-pruebas": { access: "private" },
    },
  },
});
