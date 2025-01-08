# OCR Benchmark

A benchmarking tool that compares OCR and data extraction capabilities of different large multimodal models such as gpt-4o, evaluating both text and json extraction accuracy.

## Getting started

1. Clone the repository: `git clone https://github.com/getomni-ai/benchmark.git`
2. Install dependencies: `npm install`
3. Set up API keys in `.env` for the models you want to test. Check out the [supported models](#supported-models) here. You can check `.env.example` for the required variables.

## Running the benchmark

1. Prepare your test data in `data` folder.
2. In `index.ts` file, set the `MODELS` array to the models you want to test.
3. Run the benchmark: `npm run benchmark`
4. Results will be saved in the `results/<timestamp>/results.json` file.

## Supported models

| Model Provider | Models                          | OCR | JSON Extraction | Required ENV Variables |
| -------------- | ------------------------------ | --- | --------------- | ----------------------- |
| Anthropic      | `claude-3-5-sonnet-20241022`   | ✅   | ✅              | `ANTHROPIC_API_KEY`                                                   |
| Gemini         | `gemini-2.0-flash-exp`, `gemini-1.5-pro`, `gemini-1.5-flash` | ✅   | ✅              | `GOOGLE_GENERATIVE_AI_API_KEY`                                                   |
| OpenAI         | `gpt-4o-mini`, `gpt-4o`        | ✅   | ✅              | `OPENAI_API_KEY`                                                      |
| OmniAI         | `omniai`                       | ✅   | ✅              | `OMNIAI_API_KEY`, `OMNIAI_API_URL`                                   |
| ZeroX          | `zerox`                        | ✅   | ❌              | `OPENAI_API_KEY`                                                      |
| Azure          | `azure-document-intelligence`   | ✅   | ❌              | `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`, `AZURE_DOCUMENT_INTELLIGENCE_KEY` |
| AWS            | `aws-text-extract`             | ✅   | ❌              | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`           |
| Google         | `google-document-ai`           | ✅   | ❌              | `GOOGLE_APPLICATION_CREDENTIALS`                                      |

- For Google Document AI, you need to run `gcloud auth application-default login` to authenticate first before running the benchmark.

## Evaluation

### Text similarity

We uses [levenshtein distance](https://en.wikipedia.org/wiki/Levenshtein_distance) to measure text similarity between extracted and ground truth text.
Lower distance indicates higher similarity.

### JSON accuracy

We uses [json-diff](https://github.com/zgrossbart/jdd) to identify differences between predicted and ground truth JSON objects. Accuracy is calculated as:

```math
\text{Accuracy} = 1 - \frac{\text{number of difference fields}}{\text{total fields}}
```

### Array accuracy

Some JSON schemas contain arrays. This metrics is useful for evaluating how well the model extract tables and lists from a document. Accuracy is calculated as:

```math
\text{Accuracy} = \frac{\text{number of matched items}}{\text{total items}}
```

## Benchmark Dashboard

Check out the [dashboard documentation](dashboard/README.md) for more details.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
