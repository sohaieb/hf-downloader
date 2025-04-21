import { hub } from "./config";

export type HfGetModels = {
  query?: string;
  task?: hub.PipelineType;
};

export type Quantization =
  | "q4_0"
  | "q4_1"
  | "q5_0"
  | "q5_1"
  | "q8_0"
  | "q3_K_S"
  | "q3_K_M"
  | "q3_K_L"
  | "q4_K_S"
  | "q4_K_M"
  | "q5_K_S"
  | "q5_K_M"
  | "q6_K"
  | "auto"
  | null;

export type SharedHfOllamaModelArgs = {
  inputFileOrFolderPath: string;
  tmpDirPath: string;
  modelName: string;
  quantization?: Quantization;
  onEndConversion?: () => void;
};

export type CreateOllamaModelArgs = SharedHfOllamaModelArgs & {
  forceFullInputFile?: boolean;
};

export type ConvertHfToGgufAgs = SharedHfOllamaModelArgs & {
  snapShotFolder: string;
};

export type SystemAvailableServices = "Ollama" | "GIT" | "UV";

export type SystemAvailableServicesCheck = {
  isServiceExists: boolean;
  serviceName: SystemAvailableServices;
  serviceUrl: string;
};
