# OCR Benchmark

A benchmarking tool that compares OCR and data extraction capabilities of different large multimodal models such as gpt-4o, evaluating both text and json extraction accuracy.

## Getting started

1. Clone the repository: `git clone https://github.com/getomni-ai/benchmark.git`
2. Navigate to the project directory: `cd benchmark`
3. Install dependencies: `npm install`
4. Set up API keys in `.env` for the models you want to test. Check out the [supported models](#supported-models) here. You can check `.env.example` for the required variables.

## Running the benchmark

1. Prepare your test data in `data` folder.
2. Run the benchmark: `npm run benchmark`
3. Results will be saved in the `results/<timestamp>/results.json` file.

## Supported models

| Model Provider | Models                       | Required ENV Variables             |
| -------------- | ---------------------------- | ---------------------------------- |
| OmniAI         | `omniai`                     | `OMNIAI_API_KEY`, `OMNIAI_API_URL` |
| OpenAI         | `gpt-4o-mini`, `gpt-4o`      | `OPENAI_API_KEY`                   |
| Anthropic      | `claude-3-5-sonnet-20241022` | `ANTHROPIC_API_KEY`                |

## Evaluation

### Text similarity

We uses [levenshtein distance](https://en.wikipedia.org/wiki/Levenshtein_distance) to measure text similarity between extracted and ground truth text.
Lower distance indicates higher similarity.

### JSON accuracy

We uses [json-diff](https://github.com/zgrossbart/jdd) to identify differences between predicted and ground truth JSON objects. Accuracy is calculated as:

```math
\text{Accuracy} = 1 - \frac{\text{number of difference fields}}{\text{total fields}}
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
