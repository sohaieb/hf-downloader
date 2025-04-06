import path, { join } from "path";
import { accessToken, hub } from "./config";
import chalk from "chalk";
import { spawn, spawnSync } from "child_process";
import { mkdirSync, existsSync, rmdirSync, readdirSync } from "fs";
import type { HfGetModels, Quantization } from "./types";

// Get Models from HuggingFace
export async function getModels({ query, task }: HfGetModels) {
  const result = [];
  const models = hub.listModels({
    credentials: {
      accessToken: accessToken,
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
    cacheDir: path.join(path.resolve("downloaded_models")),
  });
}

// Create Ollama Model and register it
export async function createOllamaModel(
  snapShotFolder: string,
  modelName: string,
  quantization: Quantization,
  cleanTmp?: boolean
) {
  console.log(chalk.greenBright(snapShotFolder));
  if (snapShotFolder) {
    const tmpDir = join(".", "tmp");
    mkdirSync(tmpDir, {
      recursive: true,
    });
    const outFile = `${modelName}.gguf`;
    const ps = spawn(
      "python",
      [
        "./llamacpp/convert_hf_to_gguf.py",
        snapShotFolder,
        `--outfile ${join(tmpDir, outFile)}`,
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

      let ollamaModelFileContent = await Bun.file(
        path.join(".", "templates", "Modelfile")
      ).text();
      ollamaModelFileContent = ollamaModelFileContent.replace(
        "{{path/to/[model_name].gguf}}",
        `${outFile}`
      );

      const fd = Bun.file(`${join(tmpDir, "Modelfile")}`);
      console.log(chalk.blueBright(`Writing Modelfile..`));
      await fd.write(ollamaModelFileContent);

      console.log(chalk.blueBright(`Creating Ollama model..`));
      spawnSync("ollama", ["create", modelName, "-f", "Modelfile"], {
        stdio: "inherit",
        shell: true,
        cwd: tmpDir,
      });
      console.log(chalk.greenBright(`Ollama model created successfully!`));
      if (cleanTmp) {
        cleanTmpDir();
      }
    });
  }
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
        console.log(chalk.red(`LlamaCpp packages installation ended with a code error: ${code}`));
        return rej(code);
      }
      console.log(chalk.greenBright(`LlamaCpp packages installation done.`));
      res(true);
    });
  });
}
