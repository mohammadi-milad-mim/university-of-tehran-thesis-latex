import {defineConfig} from "@playwright/test";
export default defineConfig({testDir: "e2e", timeout: 45000, workers: 1, reporter: "list", use: {actionTimeout: 10000, viewport: {width: 1600, height: 1000}, trace: "retain-on-failure"}, projects: ["chromium", "firefox", "webkit"].map(browserName => ({name: browserName, use: {browserName}}))});
