import chalk from "chalk";
import type { SystemAvailableServices } from "@/types";

// Display a warning for downloading and installing a given service
export function showInstallationWarning(
  serviceName: SystemAvailableServices,
  linkUrl: string,
) {
  console.log(
    chalk.yellow(
      `"${serviceName}" is not installed yet, please download and install it from: ${linkUrl}`,
    ),
  );
}

// Display a success message after checking installed service
export function showInstallationSuccess(serviceName: SystemAvailableServices) {
  console.log(chalk.greenBright(`"${serviceName}" is installed.`));
}
