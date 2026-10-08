const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const test = require("node:test");

const mobileRoot = path.resolve(__dirname, "..");
const autolinkingCli = path.join(
  mobileRoot,
  "node_modules",
  "expo-modules-autolinking",
  "bin",
  "expo-modules-autolinking.js",
);

test("Expo Android autolinking includes required connectivity and storage modules", () => {
  const output = execFileSync(
    process.execPath,
    [autolinkingCli, "react-native-config", "--platform", "android", "--json"],
    { cwd: mobileRoot, encoding: "utf8" },
  );
  const config = JSON.parse(output);

  for (const packageName of [
    "@react-native-async-storage/async-storage",
    "@react-native-community/netinfo",
  ]) {
    const sourceDir = config.dependencies?.[packageName]?.platforms?.android?.sourceDir;

    assert.equal(typeof sourceDir, "string", `${packageName} is missing from Expo autolinking`);
    assert.equal(
      fs.existsSync(sourceDir),
      true,
      `${packageName} sourceDir does not exist: ${sourceDir}`,
    );
    assert.equal(
      path.resolve(sourceDir).startsWith(path.join(mobileRoot, "node_modules") + path.sep),
      true,
      `${packageName} must autolink from apps/mobile/node_modules`,
    );
  }
});

test("react-native.config.js sourceDir resolves inside each native package", () => {
  const configPath = path.join(mobileRoot, "react-native.config.js");
  assert.equal(fs.existsSync(configPath), true, "apps/mobile/react-native.config.js is required");
  const projectConfig = require(configPath);

  for (const packageName of [
    "@react-native-async-storage/async-storage",
    "@react-native-community/netinfo",
  ]) {
    const sourceDir = projectConfig.dependencies?.[packageName]?.platforms?.android?.sourceDir;
    assert.equal(typeof sourceDir, "string", `${packageName} needs an Android sourceDir override`);
    const packageRoot = path.join(mobileRoot, "node_modules", packageName);
    const androidDir = path.resolve(packageRoot, sourceDir);
    assert.equal(
      androidDir.startsWith(packageRoot + path.sep),
      true,
      `${packageName} sourceDir must stay inside the package root, got ${androidDir}`,
    );
    assert.equal(
      fs.existsSync(path.join(androidDir, "build.gradle")) || fs.existsSync(path.join(androidDir, "build.gradle.kts")),
      true,
      `${packageName} Android project is missing at ${androidDir}`,
    );
  }
});

test("generated Gradle autolinking cache includes AsyncStorage and NetInfo", { skip: !fs.existsSync(path.join(mobileRoot, "android", "build", "generated", "autolinking", "autolinking.json")) && "no local Gradle autolinking cache" }, () => {
  const generated = path.join(
    mobileRoot,
    "android",
    "build",
    "generated",
    "autolinking",
    "autolinking.json",
  );
  const config = JSON.parse(fs.readFileSync(generated, "utf8"));

  for (const packageName of [
    "@react-native-async-storage/async-storage",
    "@react-native-community/netinfo",
  ]) {
    const sourceDir = config.dependencies?.[packageName]?.platforms?.android?.sourceDir;
    assert.equal(
      typeof sourceDir,
      "string",
      `${packageName} is missing from generated autolinking.json`,
    );
    assert.equal(fs.existsSync(sourceDir), true, `${packageName} cached sourceDir does not exist: ${sourceDir}`);
  }
});
