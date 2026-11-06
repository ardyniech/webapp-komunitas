// scripts/dt-releases.js - Release notes otomatis dari git log
// Menulis laporan ke data/devtools/devtools-releases.json (+salinan drg/).

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const projectRoot = "/home/ardy/projects/webapp-komunitas";
function git(args) {
  try {
    return execFileSync("git", args, { encoding: "utf-8", cwd: projectRoot }).trim();
  } catch (_) {
    return "";
  }
}

// 30 commit terakhir dengan subjek + jumlah file berubah
const logOut = git(["log", "-30", "--format=%h|%cs|%s"]);
const releases = logOut
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [hash, date, subject] = line.split("|");
    // jumlah file di commit itu
    const stat = git(["show", "--format=", "--name-only", hash]);
    const files = stat ? stat.split("\n").filter(Boolean) : [];
    return {
      hash: hash || "-",
      date: date || "-",
      subject: subject || "-",
      files_changed: files.length,
      files: files.slice(0, 8),
    };
  });

const report = {
  generated_at: new Date().toISOString(),
  branch: git(["branch", "--show-current"]) || "-",
  total_commits: parseInt(git(["rev-list", "--count", "HEAD"]) || "0", 10),
  last_30: releases,
};

require("./dt-write").writeOutputs("devtools-releases", report);
console.log(`[dt-releases] commits=${report.total_commits} latest=${releases[0] ? releases[0].hash : "-"}`);
