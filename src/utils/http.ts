import type { HfGetModels } from "@/types";
import { DOWNLOADED_MODELS_FOLDER, HF_TOKEN, hub } from "@/config";
import path from "path";
import childProcess from "child_process";
import chalk from "chalk";

// Download HuggingFace Model Snapshot
export async function pullModelSnap(repo: string) {
  return await hub.snapshotDownload({
    repo,
    revision: "main",
    cacheDir: path.join(path.resolve(DOWNLOADED_MODELS_FOLDER)),
  });
}

// Git Clone LLamaCpp repo
export function gitCloneLlamaCppRepo(): Promise<true> {
  return new Promise((res, rej) => {
    const ps = childProcess.spawn(
      "git",
      ["clone", "https://github.com/ggml-org/llama.cpp.git", "llamacpp"],
      {
        stdio: "inherit",
        shell: true,
      },
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

// Git clone HuggingFace model
export function gitCloneHuggingFaceModel(
  modelName: string,
  repoUrl: string,
): Promise<true> {
  return new Promise((res, rej) => {
    const ps = childProcess.spawn(
      "git",
      ["clone", repoUrl, path.join(DOWNLOADED_MODELS_FOLDER, modelName)],
      {
        stdio: "inherit",
        shell: true,
      },
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

// Get given Model Information
export async function getModelInfo(name: string) {
  return await hub.modelInfo({ name });
}

// Get List of Models from HuggingFace
export async function getModelsList({ query, task }: HfGetModels) {
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
