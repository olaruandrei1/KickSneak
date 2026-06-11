import fs from "fs";
import path from "path";

const dirToSearch = "c:/Users/micro/Desktop/DavidLicenta/kicksneak-fe/src";

function searchDir(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      const content = fs.readFileSync(fullPath, "utf-8");
      if (content.includes("WebSocket") || content.includes("ws://") || content.includes("8080") || content.includes("ws/")) {
        console.log(`Found match in: ${fullPath}`);
      }
    }
  }
}

searchDir(dirToSearch);
