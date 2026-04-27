"use strict";

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

/**
 * electron-builder always computes ASAR header hashes and writes `ElectronAsarIntegrity`
 * into the main bundle Info.plist. On some macOS versions (notably recent betas), that
 * path has been associated with early main-process crashes when loading from app.asar.
 * Dev (`npm run dev`) never sets this key — only packaged builds do.
 *
 * This hook removes the key before code signing so the shipped plist matches what we sign.
 * `plutil -remove` exits 1 if the key is absent; that is ignored.
 */
module.exports = async function afterPackStripAsarIntegrity(context) {
  if (context.electronPlatformName !== "darwin") {
    return;
  }
  const { appOutDir, packager } = context;
  const appFile = `${packager.appInfo.productFilename}.app`;
  const plistPath = path.join(appOutDir, appFile, "Contents", "Info.plist");
  if (!fs.existsSync(plistPath)) {
    return;
  }
  try {
    execFileSync("plutil", ["-remove", "ElectronAsarIntegrity", plistPath], {
      stdio: "ignore",
    });
  } catch {
    // Key missing or plutil unavailable — safe to ignore.
  }
};
