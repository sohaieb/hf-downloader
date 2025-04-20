import chalk from "chalk";
import {
  activatePythonEnvWithUV,
  checkAllToolsAreInstalled,
  checkInstalledToool,
  createAndRegisterOllamaModel,
  downloadSnap,
  getModelInfo,
  getQualitzationsList,
  isInvalidLlamacppDirectory,
  pullLlamaCppRepo,
  setupLlamaCppRepoRequirements,
} from "./src/utilities";
import { Command } from "commander";
import type { Quantization } from "./src/types";
import { PYTHON_VERSION } from "./src/config";

const program = new Command();

program
  .name("hf-downloader")
  .description(
    "CLI to download models from HuggingFace and convert them into Ollama models"
  )
  .version("1.0.0");

program
  .option("-m,--model <string>", "HuggingFace model path")
  .option(
    "-q, --quantization <string>",
    "Quantization value (default: auto)",
    "auto"
  )
  .option(
    "--llmcpp",
    "Set the tool used for convertion (default: undefined) - DEPRECATED: will be removed soon."
  )
  .option("-l, --list-quantizations", "List quantizations possible values")
  .option("-c, --clean", "Finalize process by cleaning TMP directory")
  .action(async (options) => {
    try {
      await checkAllToolsAreInstalled();

      if (options.listQuantizations) {
        return console.log(getQualitzationsList().join("\n\r"));
      }

      if (options.model && options.quantization) {
        const hfModelURIArray = options.model.split("/");
        const hfQuantization = options.quantization;

        const modelName = hfModelURIArray[hfModelURIArray.length - 1];
        const isLlmcpp = options.llmcpp ?? false;
        const quantization: Quantization =
          hfQuantization === "auto" && !isLlmcpp ? null : hfQuantization;

        try {
          if (isLlmcpp && isInvalidLlamacppDirectory()) {
            await pullLlamaCppRepo();
            await activatePythonEnvWithUV(PYTHON_VERSION);
            await setupLlamaCppRepoRequirements();
          }
          const model = await getModelInfo(options.model);

          const folder = await downloadSnap(model.name);
          await createAndRegisterOllamaModel(
            folder,
            modelName,
            quantization,
            options.clean,
            isLlmcpp
          );
        } catch (error) {
          console.log(chalk.red(error));
        }
      } else {
        program.help();
      }
    } catch (error) {
      console.log(chalk.red(error));
    }
  });

program.parse();
