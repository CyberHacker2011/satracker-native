const fs = require("fs");
const path = require("path");

const distPath = path.join(__dirname, "electron", "dist");
const clientPath = path.join(distPath, "client");

// Check if Expo exported to a 'client' subdirectory (happens with output: 'server')
if (fs.existsSync(clientPath)) {
  console.log(
    "Detected multi-folder export. Moving client files to dist root...",
  );

  const moveRecursive = (src, dest) => {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

    const files = fs.readdirSync(src);
    for (const file of files) {
      const srcFile = path.join(src, file);
      const destFile = path.join(dest, file);

      if (fs.statSync(srcFile).isDirectory()) {
        moveRecursive(srcFile, destFile);
      } else {
        fs.renameSync(srcFile, destFile);
      }
    }
  };

  try {
    moveRecursive(clientPath, distPath);
    // Remove empty client directory
    fs.rmSync(clientPath, { recursive: true, force: true });
    console.log("✓ Moved client files to root.");
  } catch (err) {
    console.error("✗ Error moving files:", err.message);
  }
}

// Path to the built index.html
const indexPath = path.join(distPath, "index.html");

if (!fs.existsSync(indexPath)) {
  console.error(`✗ Error: index.html not found at ${indexPath}`);
  process.exit(1);
}

console.log("Fixing paths in index.html for Electron...");

try {
  // Read the HTML file
  let html = fs.readFileSync(indexPath, "utf8");

  // Replace absolute paths with relative paths
  // Fix favicon
  html = html.replace(/href="\/favicon\.ico"/g, 'href="./favicon.ico"');

  // Fix script and link tags with absolute paths
  // Using a more generic regex to catch all absolute paths starting with /
  html = html.replace(/(src|href)="\/([^"]+)"/g, (match, type, p1) => {
    // Don't modify http/https URLs or already relative paths
    if (p1.startsWith("http") || p1.startsWith(".")) return match;
    return `${type}="./${p1}"`;
  });

  // Write back
  fs.writeFileSync(indexPath, html, "utf8");

  console.log("✓ Successfully fixed paths in index.html");
} catch (error) {
  console.error("✗ Error fixing index.html:", error.message);
  process.exit(1);
}
