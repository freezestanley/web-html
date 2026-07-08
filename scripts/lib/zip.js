const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

function createZipFromEntries(cwd, outputPath, entries) {
  const absoluteOutputPath = path.resolve(outputPath);
  if (fs.existsSync(absoluteOutputPath)) {
    fs.rmSync(absoluteOutputPath, { force: true });
  }

  execFileSync(
    "python3",
    [
      "-c",
      [
        "import os, sys, zipfile",
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
        "                archive.write(file_path, os.path.relpath(file_path, '.'))",
        "    elif os.path.exists(entry):",
        "        archive.write(entry, entry)",
        "",
        "output_path = sys.argv[1]",
        "entries = sys.argv[2:]",
        "with zipfile.ZipFile(output_path, 'w', compression=zipfile.ZIP_DEFLATED) as archive:",
        "    for entry in entries:",
        "        add_entry(archive, entry)"
      ].join("\n"),
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
  return createZipFromEntries(projectPath, outputPath, ["manifest.json", "dist"]);
}

module.exports = {
  createDistZip,
  createSourceZip
};
