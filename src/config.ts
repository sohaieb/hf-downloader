import * as hub from "@huggingface/hub";

const HF_TOKEN: string = Bun.env.HF_TOKEN!;
const DOWNLOADED_MODELS_FOLDER: string = Bun.env.DOWNLOADED_MODELS_FOLDER!;
const PYTHON_VERSION = Bun.env.PYTHON_VERSION!;

export { HF_TOKEN, DOWNLOADED_MODELS_FOLDER, PYTHON_VERSION, hub };
