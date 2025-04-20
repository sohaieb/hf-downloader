export * as hub from "@huggingface/hub";

export const HF_TOKEN: string = Bun.env.HF_TOKEN!;
export const DOWNLOADED_MODELS_FOLDER: string =
  Bun.env.DOWNLOADED_MODELS_FOLDER!;
export const PYTHON_VERSION = Bun.env.PYTHON_VERSION!;