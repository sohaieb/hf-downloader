import path, { join } from "path";
import { DOWNLOADED_MODELS_FOLDER, HF_TOKEN, hub } from "./config";
import chalk from "chalk";
import { spawn, spawnSync } from "child_process";
import { mkdirSync, existsSync, rmdirSync, readdirSync } from "fs";
import type {
  ConvertHfToGgufAgs,
  CreateOllamaModelArgs,
  HfGetModels,
  Quantization,
  SystemAvailableServices,
  SystemAvailableServicesCheck,
} from "./types";

// Get Models from HuggingFace
export async function getModels({ query, task }: HfGetModels) {
  const result = [];
  const models = hub.listModels({
    credentials: {
      accessToken: HF_TOKEN,
    },
    search: {
      query: query ?? "",
      task: task ?? "text-generation",
    },
  });
  for await (const model of models) {
    result.push(model);
  }
  return result;
}

// Get given Model Informations
export async function getModelInfo(name: string) {
  return await hub.modelInfo({ name });
}

// Download Model Snapshot
export async function downloadSnap(repo: string) {
  return await hub.snapshotDownload({
    repo,
    revision: "main",
    cacheDir: path.join(path.resolve(DOWNLOADED_MODELS_FOLDER)),
  });
}

// Create Ollama Model and register it
export async function createAndRegisterOllamaModel(
  snapShotFolder: string,
  modelName: string,
  quantization: Quantization,
  cleanTmp?: boolean,
  isLlmcpp?: boolean
) {
  console.log(chalk.greenBright(snapShotFolder));
  if (snapShotFolder) {
    const tmpDirPath = join(".", "tmp");
    let inputFileOrFolderPath: string;

    if (isLlmcpp) {
      inputFileOrFolderPath = `${modelName}.gguf`;
      mkdirSync(tmpDirPath, {
        recursive: true,
      });

      convertHfToGGUFViaLLamacpp({
        modelName,
        inputFileOrFolderPath,
        quantization,
        snapShotFolder,
        tmpDirPath,
        onEndConversion: () => {
          if (cleanTmp) {
            cleanTmpDir();
          }
        },
      });
    } else {
      inputFileOrFolderPath = snapShotFolder;
      const normalizedInputFileOrFolderPath = path
        .relative(
          join(process.cwd(), "tmp"),
          path.relative(process.cwd(), inputFileOrFolderPath)
        )
        .replace(/\\+/g, "/");
      console.log(
        chalk.yellow(`Information: ${normalizedInputFileOrFolderPath}`)
      );
      await createOllamaModel({
        modelName,
        inputFileOrFolderPath: normalizedInputFileOrFolderPath,
        tmpDirPath,
        quantization,
        forceFullInputFile: true,
        onEndConversion: () => {
          if (cleanTmp) {
            cleanTmpDir();
          }
        },
      });
    }
  }
}

// Activate python virtual environment for LLMCPP
export function activatePythonEnvWithUV(pythonVersion: string) {
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
        `HF-Downloader can not identify your OS. It's only supported by Windows, Linux and MacOS`
      );
    }

    const spawnedPythonInstallationRequirements = spawn(finalCommand, {
      stdio: "inherit",
      shell: true,
      cwd: "llamacpp",
    });

    spawnedPythonInstallationRequirements.on("exit", (code: number) => {
      if (code !== 0) {
        rej(code);
      }

      res(code);
    });
  });
}

export function convertHfToGGUFViaLLamacpp({
  snapShotFolder,
  tmpDirPath,
  inputFileOrFolderPath,
  quantization,
  modelName,
  onEndConversion,
}: ConvertHfToGgufAgs) {
  const ps = spawn(
    "python",
    [
      "./llamacpp/convert_hf_to_gguf.py",
      snapShotFolder,
      `--outfile ${join(tmpDirPath, inputFileOrFolderPath)}`,
      `--outtype ${quantization}`,
    ],
    {
      shell: true,
      stdio: "inherit",
    }
  );

  ps.stdout?.on("data", (data) => {
    console.log(console.log(chalk.blueBright(data)));
  });

  ps.stderr?.on("data", (data) => {
    console.error(chalk.red(`Error: ${data}`));
  });

  ps.on("close", async (code) => {
    if (code !== 0) {
      return console.log(chalk.yellow(`ps process exited with code ${code}`));
    }
    await createOllamaModel({
      modelName,
      tmpDirPath,
      inputFileOrFolderPath,
      quantization,
      onEndConversion,
    });
  });
}

// Create Ollama Modelfile and register it to Ollama with the given args
async function createOllamaModel({
  modelName,
  inputFileOrFolderPath,
  tmpDirPath,
  quantization,
  forceFullInputFile,
  onEndConversion,
}: CreateOllamaModelArgs) {
  // Read & Replace Modelfile.template by the correct value
  const ollamaModelFileTemplateContent = await Bun.file(
    path.join(".", "templates", "Modelfile.template")
  ).text();

  let ollamaModelFileContent = ollamaModelFileTemplateContent.replace(
    `${forceFullInputFile ? "./" : ""}{{path/to/[model_name].gguf}}`,
    `${inputFileOrFolderPath}`
  );

  // Create Modelfile in TMP folder
  const fd = Bun.file(`${join(tmpDirPath, "Modelfile")}`);
  console.log(chalk.blueBright(`Writing final Modelfile..`));
  await fd.write(ollamaModelFileContent);

  console.log(chalk.blueBright(`Creating Ollama model..`));

  // Prepare ollama create args
  const ollamaArgs = ["create", "-f", "Modelfile", modelName];
  if (quantization) {
    ollamaArgs.splice(3, 0, `--quantize ${quantization}`);
  }

  console.log(chalk.blueBright(`Executing: ollama ${ollamaArgs.join(" ")}`));
  // Execute ollamma model creation
  const spawnedOllamaCreate = spawnSync("ollama", ollamaArgs, {
    stdio: "inherit",
    shell: true,
    cwd: tmpDirPath,
  });

  if (spawnedOllamaCreate.stderr) {
    return console.log(chalk.red(spawnedOllamaCreate.stderr));
  }

  console.log(chalk.greenBright(`Ollama model created successfully!`));
  onEndConversion?.();
}

// Clean TMP directory and delete it from File System
function cleanTmpDir() {
  console.log(chalk.blueBright(`Cleaning TMP directory..`));
  rmdirSync("tmp", {
    recursive: true,
  });
  console.log(chalk.greenBright(`TMP cleaned successfully!`));
}

// Get Quantizations list
export function getQualitzationsList(): Quantization[] {
  return [
    "q4_0",
    "q4_1",
    "q5_0",
    "q5_1",
    "q8_0",
    "q3_K_S",
    "q3_K_M",
    "q3_K_L",
    "q4_K_S",
    "q4_K_M",
    "q5_K_S",
    "q5_K_M",
    "q6_K",
    "auto",
  ];
}

// Check if llama.cpp directory exists and it's not empty
export function isInvalidLlamacppDirectory() {
  const llamacppPath = join(".", "llamacpp");
  if (existsSync(llamacppPath)) {
    const dir = readdirSync(llamacppPath);
    const isEmpty = dir.some((file) => file === "." || "..")
      ? dir.length <= 2
      : dir.length <= 0;
    return isEmpty;
  }
  return true;
}

export function pullLlamaCppRepo(): Promise<true> {
  return new Promise((res, rej) => {
    const ps = spawn(
      "git",
      ["clone", "https://github.com/ggml-org/llama.cpp.git", "llamacpp"],
      {
        stdio: "inherit",
        shell: true,
      }
    );

    ps.stdout?.on("data", (chunk) => {
      console.log(chalk.blue(chunk));
    });

    ps.stderr?.on("data", (chunk) => {
      console.log(chalk.red(chunk));
      rej(chunk);
    });

    ps.on("close", (code) => {
      if (code !== 0) {
        console.log(chalk.red(`git pull ended with a code error: ${code}`));
        return rej(code);
      }
      console.log(chalk.greenBright(`git pull llamapcpp done.`));
      res(true);
    });
  });
}

// Install LlamaCpp requirements
export function setupLlamaCppRepoRequirements(): Promise<true> {
  return new Promise((res, rej) => {
    const ps = spawn("pip", ["install", "-r requirements.txt"], {
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
            `LlamaCpp packages installation ended with a code error: ${code}`
          )
        );
        return rej(code);
      }
      console.log(chalk.greenBright(`LlamaCpp packages installation done.`));
      res(true);
    });
  });
}

// Clone HuggingFace model
export function cloneHuggingFaceModel(
  modelName: string,
  repoUrl: string
): Promise<true> {
  return new Promise((res, rej) => {
    const ps = spawn(
      "git",
      ["clone", repoUrl, join(DOWNLOADED_MODELS_FOLDER, modelName)],
      {
        stdio: "inherit",
        shell: true,
      }
    );

    ps.stdout?.on("data", (chunk) => {
      console.log(chalk.blue(chunk));
    });

    ps.stderr?.on("data", (chunk) => {
      console.log(chalk.red(chunk));
      rej(chunk);
    });

    ps.on("close", (code) => {
      if (code !== 0) {
        console.log(chalk.red(`git pull ended with a code error: ${code}`));
        return rej(code);
      }
      console.log(chalk.greenBright(`git pull ${modelName} done.`));
      res(true);
    });
  });
}

// Check if a tool is well installed in your machine
export function checkInstalledToool(
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
    const spawnedCmd = spawn(cmd, args, {
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
export async function checkAllToolsAreInstalled() {
  const [gitExists, ollamaExists, uvExists] = await Promise.all([
    checkInstalledToool("git", "-v"),
    checkInstalledToool("ollama", "--version"),
    checkInstalledToool("uv", "--version"),
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
    chalk.blueBright(`Checking Ollama, UV, GIT services installed..`)
  );

  someServicesAreNotInstalled.isGitExists = checkDownloadedAndInstalledService({
    serviceName: "GIT",
    isServiceExists:
      typeof gitExists === "boolean" ? gitExists : gitExists.isNotFound,
    serviceUrl: "https://git-scm.com/downloads",
  });

  someServicesAreNotInstalled.isOllamaExists =
    checkDownloadedAndInstalledService({
      serviceName: "Ollama",
      isServiceExists:
        typeof ollamaExists === "boolean"
          ? ollamaExists
          : ollamaExists.isNotFound,
      serviceUrl: "https://ollama.com/",
    });

  someServicesAreNotInstalled.isUVExists = checkDownloadedAndInstalledService({
    serviceName: "UV",
    isServiceExists:
      typeof uvExists === "boolean" ? uvExists : uvExists.isNotFound,
    serviceUrl: "https://docs.astral.sh/uv/getting-started/",
  });
  return Object.values(someServicesAreNotInstalled).every(Boolean);
}

// Display a warning for downloading and installing a given service
function downloadAndInstallServiceWarning(
  serviceName: SystemAvailableServices,
  linkUrl: string
) {
  console.log(
    chalk.yellow(
      `"${serviceName}" is not installed yet, please download and install it from: ${linkUrl}`
    )
  );
}

// Display a success message after checking installed service
function downloadAndInstallServiceSuccessed(
  serviceName: SystemAvailableServices
) {
  console.log(chalk.greenBright(`"${serviceName}" is installed.`));
}

function checkDownloadedAndInstalledService({
  isServiceExists,
  serviceName,
  serviceUrl,
}: SystemAvailableServicesCheck) {
  if (!isServiceExists) {
    downloadAndInstallServiceWarning(serviceName, serviceUrl);
    return false;
  }
  downloadAndInstallServiceSuccessed(serviceName);
  return true;
}
