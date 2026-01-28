const fs = require("fs");
const path = require("path");

// Path to the built index.html
const indexPath = path.join(__dirname, "electron", "dist", "index.html");

console.log("Fixing paths in index.html for Electron...");

try {
  // Read the HTML file
  let html = fs.readFileSync(indexPath, "utf8");

  // Replace absolute paths with relative paths
  // Fix favicon
  html = html.replace(/href="\/favicon\.ico"/g, 'href="./favicon.ico"');

  // Fix script and link tags with absolute paths
  html = html.replace(/src="\/_expo\//g, 'src="./_expo/');
  html = html.replace(/href="\/_expo\//g, 'href="./_expo/');

  // Fix any other absolute paths that start with /
  html = html.replace(/src="\/([^"]+)"/g, 'src="./$1"');
  html = html.replace(/href="\/([^"]+)"/g, (match, p1) => {
    // Don't modify http/https URLs
    if (p1.startsWith("http")) return match;
    return `href="./${p1}"`;
  });

  // Write back
  fs.writeFileSync(indexPath, html, "utf8");

  console.log("✓ Successfully fixed paths in index.html");
  console.log("  - Changed absolute paths (/) to relative paths (./)");
} catch (error) {
  console.error("✗ Error fixing index.html:", error.message);
  process.exit(1);
}
