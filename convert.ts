import chalk from "chalk";
import {
  createOllamaModel,
  downloadSnap,
  getModelInfo,
  getQualitzationsList,
  isInvalidLlamacppDirectory,
  pullLlamaCppRepo,
  setupLlamaCppRepoRequirements,
} from "./src/utilities";
import { Command } from "commander";

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
  .option("-l, --list-quantizations", "List quantizations possible values")
  .option("-c, --clean", "Finalize process by cleaning TMP directory")
  .action(async (options) => {
    if (options.listQuantizations) {
      return console.log(getQualitzationsList().join("\n\r"));
    }
    if (options.model && options.quantization) {
      const hfModelURIArray = options.model.split("/");
      const hfQuantization = options.quantization;

      const modelName = hfModelURIArray[hfModelURIArray.length - 1];
      const quantization = hfQuantization ?? "auto";
      try {
        if (isInvalidLlamacppDirectory()) {
          await pullLlamaCppRepo();
          await setupLlamaCppRepoRequirements();
        }
        const model = await getModelInfo(options.model);

        downloadSnap(model.name).then(async (folder) => {
          await createOllamaModel(
            folder,
            modelName,
            quantization,
            options.clean
          );
        });
      } catch (error) {
        console.log(chalk.red(error));
      }
    } else {
      program.help();
    }
  });

program.parse();
