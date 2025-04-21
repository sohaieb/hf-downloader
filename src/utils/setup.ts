import childProcess from "child_process";
import chalk from "chalk";

// Install specific Python version using UV manager and Activate the virtual environment for LLMCPP
export function setupPythonEnvironment(pythonVersion: string) {
  return new Promise((res, rej) => {
    let baseCommand = `uv venv llmcpenv --python ${pythonVersion} --seed`;
    let finalCommand: string;

    if (process.platform === "win32") {
      finalCommand = `
    ${baseCommand}
    llmcpenv/activate
    `;
    } else if (process.platform === "linux" || process.platform === "darwin") {
      finalCommand = `
    ${baseCommand}
    source venv/bin/activate
    `;
    } else {
      throw new Error(
        `HF-Downloader can not identify your OS. It's only supported by Windows, Linux and MacOS`,
      );
    }

    const spawnedPythonInstallationRequirements = childProcess.spawn(
      finalCommand,
      {
        stdio: "inherit",
        shell: true,
        cwd: "llamacpp",
      },
    );

    spawnedPythonInstallationRequirements.on("exit", (code: number) => {
      if (code !== 0) {
        rej(code);
      }

      res(code);
    });
  });
}

// Install LlamaCpp python packages
export function setupLlamaCppEnvironment(): Promise<true> {
  return new Promise((res, rej) => {
    const ps = childProcess.spawn("pip", ["install", "-r requirements.txt"], {
      stdio: "inherit",
      shell: true,
      cwd: "llamacpp",
    });

    ps.stdout?.on("data", (chunk) => {
      console.log(chalk.blue(chunk));
    });

    ps.stderr?.on("data", (chunk) => {
      console.log(chalk.red(chunk));
      rej(chunk);
    });

    ps.on("close", (code) => {
      if (code !== 0) {
        console.log(
          chalk.red(
            `LlamaCpp packages installation ended with a code error: ${code}`,
          ),
        );
        return rej(code);
      }
      console.log(chalk.greenBright(`LlamaCpp packages installation done.`));
      res(true);
    });
  });
}
