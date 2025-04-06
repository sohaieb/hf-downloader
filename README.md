# <img src="https://huggingface.co/front/assets/huggingface_logo-noborder.svg" alt="Hugging Face logo" width="32" height="32"> HF-downloader

A tool to download models from Hugging Face and convert them to GGUF format for use with Ollama.
This project simplifies the process of obtaining and preparing models for various applications.

**Note:** This project is under construction and may not be stable.

## 🚀 Getting Started

To install dependencies:

```bash
bun install
```

To run:

- Create a Hugging Face token: [Hugging Face Tokens](https://huggingface.co/docs/hub/security-tokens)
- Copy `.env.example` to `.env` and set your `HF_TOKEN`.
- Then:

```bash
bun run convert.ts -h
```

## ✨ How to Use HF-downloader

- Run `bun convert -h` to show available options and usage instructions. For example:

  - List available quantizations: `bun run convert.ts --list-quantizations`
  - Convert `facebook/opt-125m` with auto-quantization: `bun run convert.ts --model facebook/opt-125m`
  - Convert `facebook/opt-125m` with 4-bit quantization: `bun run convert.ts --model facebook/opt-125m --quantization q4_0`
  - Convert `facebook/opt-125m` and clean up temporary files: `bun run convert.ts --model facebook/opt-125m --clean`

- Configure the download location and other settings in `src/config.ts`.
- Utilize the `src/utilities.ts` for helper functions.

## ✍️ Author

Sohaieb Azaiez

## <img src="https://api.iconify.design/octicon:law.svg?color=%23f08080&height=32" alt="License"  /> License

MIT
