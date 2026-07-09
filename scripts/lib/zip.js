const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const DIST_EXCLUDE_PATTERNS = ["preview.png", "preview.jpg", "screenshot.png", "screenshot.jpg"];

function createZipFromEntries(cwd, outputPath, entries, excludePatterns = []) {
  const absoluteOutputPath = path.resolve(outputPath);
  if (fs.existsSync(absoluteOutputPath)) {
    fs.rmSync(absoluteOutputPath, { force: true });
  }

  const excludeArg = excludePatterns.length > 0 ? JSON.stringify(excludePatterns) : "[]";

  execFileSync(
    "python3",
    [
      "-c",
      [
        "import json, os, sys, zipfile",
        "",
        "exclude_patterns = json.loads(sys.argv[1])",
        "",
        "def is_excluded(relpath):",
        "    basename = os.path.basename(relpath)",
        "    return basename in exclude_patterns",
        "",
        "def write_dir(archive, arcname):",
        "    if not arcname.endswith('/'):",
        "        arcname += '/'",
        "    archive.writestr(zipfile.ZipInfo(arcname), b'')",
        "",
        "def add_entry(archive, entry):",
        "    if os.path.isdir(entry):",
        "        write_dir(archive, entry)",
        "        for current_root, dirnames, filenames in os.walk(entry):",
        "            dirnames.sort()",
        "            filenames.sort()",
        "            for dirname in dirnames:",
        "                dir_path = os.path.join(current_root, dirname)",
        "                write_dir(archive, os.path.relpath(dir_path, '.'))",
        "            for filename in filenames:",
        "                file_path = os.path.join(current_root, filename)",
        "                rel_path = os.path.relpath(file_path, '.')",
        "                if not is_excluded(rel_path):",
        "                    archive.write(file_path, rel_path)",
        "    elif os.path.exists(entry):",
        "        if not is_excluded(entry):",
        "            archive.write(entry, entry)",
        "",
        "output_path = sys.argv[2]",
        "entries = sys.argv[3:]",
        "with zipfile.ZipFile(output_path, 'w', compression=zipfile.ZIP_DEFLATED) as archive:",
        "    for entry in entries:",
        "        add_entry(archive, entry)"
      ].join("\n"),
      excludeArg,
      absoluteOutputPath,
      ...entries
    ],
    { cwd, stdio: "pipe" }
  );

  return absoluteOutputPath;
}

function createSourceZip(projectPath) {
  const outputPath = path.join(projectPath, "project.zip");
  const entries = fs.readdirSync(projectPath).filter((entry) => !entry.endsWith(".zip"));
  return createZipFromEntries(projectPath, outputPath, entries);
}

function createDistZip(projectPath) {
  const outputPath = path.join(projectPath, "dist.zip");
  return createZipFromEntries(projectPath, outputPath, ["manifest.json", "dist"], DIST_EXCLUDE_PATTERNS);
}

module.exports = {
  createDistZip,
  createSourceZip
};
