import chalk from "chalk";
import fs from "fs";
import path from "path";

// Clean TMP directory and delete it from File System
export function cleanTmpDir() {
  console.log(chalk.blueBright(`Cleaning TMP directory..`));
  fs.rmdirSync("tmp", {
    recursive: true,
  });
  console.log(chalk.greenBright(`TMP cleaned successfully!`));
}

// Check if llama.cpp directory exists and it's not empty
export function isInvalidLlamacppDirectory() {
  const llamacppPath = path.join(".", "llamacpp");
  if (fs.existsSync(llamacppPath)) {
    const dir = fs.readdirSync(llamacppPath);
    return dir.some((file) => file === "." || "..")
      ? dir.length <= 2
      : dir.length <= 0;
  }
  return true;
}
