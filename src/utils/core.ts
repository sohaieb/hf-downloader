import type {
  ConvertHfToGgufAgs,
  CreateOllamaModelArgs,
  Quantization,
} from "@/types";
import childProcess from "child_process";
import path from "path";
import chalk from "chalk";
import fs from "node:fs";
import { cleanTmpDir } from "@/utils/filesystem.ts";

// Create Ollama Model and register it
export async function createAndRegisterOllamaModel(
  snapShotFolder: string,
  modelName: string,
  quantization: Quantization,
  cleanTmp?: boolean,
  isLlmcpp?: boolean,
) {
  console.log(chalk.greenBright(snapShotFolder));
  if (snapShotFolder) {
    const tmpDirPath = path.join(".", "tmp");
    let inputFileOrFolderPath: string;

    if (isLlmcpp) {
      inputFileOrFolderPath = `${modelName}.gguf`;
      fs.mkdirSync(tmpDirPath, {
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
          path.join(process.cwd(), "tmp"),
          path.relative(process.cwd(), inputFileOrFolderPath),
        )
        .replace(/\\+/g, "/");
      console.log(
        chalk.yellow(`Information: ${normalizedInputFileOrFolderPath}`),
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

// Convert HuggingFace Models to GGUF basing on LLamacpp conversion
export function convertHfToGGUFViaLLamacpp({
  snapShotFolder,
  tmpDirPath,
  inputFileOrFolderPath,
  quantization,
  modelName,
  onEndConversion,
}: ConvertHfToGgufAgs) {
  const ps = childProcess.spawn(
    "python",
    [
      "./llamacpp/convert_hf_to_gguf.py",
      snapShotFolder,
      `--outfile ${path.join(tmpDirPath, inputFileOrFolderPath)}`,
      `--outtype ${quantization}`,
    ],
    {
      shell: true,
      stdio: "inherit",
    },
  );

  ps.stdout?.on("data", (data) => {
    console.log(chalk.blueBright(data));
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
    path.join(".", "templates", "Modelfile.template"),
  ).text();

  let ollamaModelFileContent = ollamaModelFileTemplateContent.replace(
    `${forceFullInputFile ? "./" : ""}{{path/to/[model_name].gguf}}`,
    `${inputFileOrFolderPath}`,
  );

  // Create Modelfile in TMP folder
  const fd = Bun.file(`${path.join(tmpDirPath, "Modelfile")}`);
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
  const spawnedOllamaCreate = childProcess.spawn("ollama", ollamaArgs, {
    stdio: "inherit",
    shell: true,
    cwd: tmpDirPath,
  });

  spawnedOllamaCreate.stderr?.on("data", (chunk) => {
    console.log(chalk.red(chunk));
  });

  spawnedOllamaCreate.on("close", (code) => {
    if (code !== 0) {
      return console.log(chalk.red("Process exited with error!"));
    }

    console.log(chalk.greenBright(`Ollama model created successfully!`));
    onEndConversion?.();
  });
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
