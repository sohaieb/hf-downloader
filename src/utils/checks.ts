import type { SystemAvailableServicesCheck } from "@/types";
import chalk from "chalk";
import childProcess from "child_process";
import { showInstallationSuccess, showInstallationWarning } from "@/utils/console.ts";

export function checkInstalledService({
  isServiceExists,
  serviceName,
  serviceUrl,
}: SystemAvailableServicesCheck) {
  if (!isServiceExists) {
    showInstallationWarning(serviceName, serviceUrl);
    return false;
  }
  showInstallationSuccess(serviceName);
  return true;
}

// Check if a tool is well installed in your machine
export function checkInstalledTool(
  cmd: string,
  ...args: string[]
): Promise<
  | true
  | {
  message: string;
  isNotFound: boolean;
}
> {
  return new Promise((res, rej) => {
    const spawnedCmd = childProcess.spawn(cmd, args, {
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let errMessage: string = "";
    spawnedCmd.stderr.on("data", (ch) => {
      errMessage += ch.toString();
    });

    spawnedCmd.on("exit", (code) => {
      if (code !== 0) {
        rej({
          message: errMessage,
          isNotFound:
            errMessage.includes("est pas reconnu") ||
            errMessage.includes("not found"),
        });
      }
      res(true);
    });
  });
}


// Check all required tools installed
export async function checkInstalledTools() {
  const [gitExists, ollamaExists, uvExists] = await Promise.all([
    checkInstalledTool("git", "-v"),
    checkInstalledTool("ollama", "--version"),
    checkInstalledTool("uv", "--version"),
  ]);

  let someServicesAreNotInstalled: {
    isGitExists: boolean;
    isOllamaExists: boolean;
    isUVExists: boolean;
  } = {
    isGitExists: false,
    isOllamaExists: false,
    isUVExists: false,
  };

  console.log(
    chalk.blueBright(`Checking Ollama, UV, GIT services installed..`),
  );

  someServicesAreNotInstalled.isGitExists = checkInstalledService({
    serviceName: "GIT",
    isServiceExists:
      typeof gitExists === "boolean" ? gitExists : gitExists.isNotFound,
    serviceUrl: "https://git-scm.com/downloads",
  });

  someServicesAreNotInstalled.isOllamaExists = checkInstalledService({
    serviceName: "Ollama",
    isServiceExists:
      typeof ollamaExists === "boolean"
        ? ollamaExists
        : ollamaExists.isNotFound,
    serviceUrl: "https://ollama.com/",
  });

  someServicesAreNotInstalled.isUVExists = checkInstalledService({
    serviceName: "UV",
    isServiceExists:
      typeof uvExists === "boolean" ? uvExists : uvExists.isNotFound,
    serviceUrl: "https://docs.astral.sh/uv/getting-started/",
  });
  return Object.values(someServicesAreNotInstalled).every(Boolean);
}