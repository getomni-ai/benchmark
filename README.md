# OCR Benchmark

A benchmarking tool that compares OCR and data extraction capabilities of different large multimodal models such as gpt-4o, evaluating both text and json extraction accuracy.

## Evaluation Metrics

### JSON accuracy

We use a modified [json-diff](https://github.com/zgrossbart/jdd) to identify differences between predicted and ground truth JSON objects. You can review the [evaluation/json.ts](./src/evaluation/json.ts) file to see the exact implementation. Accuracy is calculated as:

```math
\text{Accuracy} = 1 - \frac{\text{number of difference fields}}{\text{total fields}}
```

![json-diff](https://omniai-images.s3.us-east-1.amazonaws.com/json_accuracy.png)

### Text similarity

While the primary benchmark metric is JSON accuracy, we have included [levenshtein distance](https://en.wikipedia.org/wiki/Levenshtein_distance) as a measurement of text similarity between extracted and ground truth text.
Lower distance indicates higher similarity. Note this scoring method heavily penalizes accurate text that does not conform to the exact layout of the ground truth data.

In the example below, an LLM could decode both blocks of text without any issue. All the information is 100% accurate, but slight rearrangements of the header text (address, phone number, etc.) result in a large difference on edit distance scoring.

![text-similarity](https://omniai-images.s3.us-east-1.amazonaws.com/edit_distance.png)

## Running the benchmark

1. Clone the repo and install dependencies: `npm install`
2. Prepare your test data
   1. For local data, add individual files to the `data` folder.
   2. To pull from a DB, add `DATABASE_URL` in your `.env`
3. In `index.ts` file, set the `MODELS` array to the models you want to test. Set up API keys in `.env` for the models you want to test. Check out the [supported models](#supported-models) here. You can check `.env.example` for the required variables.
4. Run the benchmark: `npm run benchmark`
5. Results will be saved in the `results/<timestamp>/results.json` file.

## Supported models

To enable specific models, create a `models.yaml` file in the `src` directory. Check out the [models.example.yaml](./src/models.example.yaml) file for the required variables.

```yaml
models:
  - ocr: gemini-2.0-flash-001 # The model to use for OCR
    extraction: gpt-4o # The model to use for JSON extraction

  - ocr: gpt-4o
    extraction: gpt-4o
    directImageExtraction: true # Whether to use the model's native image extraction capabilities
```

The supported models are:

<table>
<tr>
    <th>Model Provider</th>
    <th>Models</th>
    <th>OCR</th>
    <th>JSON Extraction</th>
    <th>Required ENV Variables</th>
</tr>
<tr>
    <td>Anthropic</td>
    <td>`claude-3-5-sonnet-20241022`</td>
    <td>✅</td>
    <td>✅</td>
    <td>`ANTHROPIC_API_KEY`</td>
</tr>
<tr>
    <td>Gemini</td>
    <td>`gemini-2.0-flash-001`<br>`gemini-1.5-pro`<br>`gemini-1.5-flash`</td>
    <td>✅</td>
    <td>✅</td>
    <td>`GOOGLE_GENERATIVE_AI_API_KEY`</td>
</tr>
<tr>
    <td>OpenAI</td>
    <td>`gpt-4o-mini`<br>`gpt-4o`</td>
    <td>✅</td>
    <td>✅</td>
    <td>`OPENAI_API_KEY`</td>
</tr>
<tr>
    <td>OmniAI</td>
    <td>`omniai`</td>
    <td>✅</td>
    <td>✅</td>
    <td>`OMNIAI_API_KEY`<br>`OMNIAI_API_URL`</td>
</tr>
<tr>
    <td>ZeroX</td>
    <td>`zerox`</td>
    <td>✅</td>
    <td>❌</td>
    <td>`OPENAI_API_KEY`</td>
</tr>
<tr>
    <td>Azure</td>
    <td>`azure-document-intelligence`</td>
    <td>✅</td>
    <td>❌</td>
    <td>`AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`<br>`AZURE_DOCUMENT_INTELLIGENCE_KEY`</td>
</tr>
<tr>
    <td>AWS</td>
    <td>`aws-text-extract`</td>
    <td>✅</td>
    <td>❌</td>
    <td>`AWS_ACCESS_KEY_ID`<br>`AWS_SECRET_ACCESS_KEY`<br>`AWS_REGION`</td>
</tr>
<tr>
    <td>Google</td>
    <td>`google-document-ai`</td>
    <td>✅</td>
    <td>❌</td>
    <td>`GOOGLE_LOCATION`<br>`GOOGLE_PROJECT_ID`<br>`GOOGLE_PROCESSOR_ID`<br>`GOOGLE_APPLICATION_CREDENTIALS_PATH`</td>
</tr>
<tr>
    <td>Unstructured</td>
    <td>`unstructured`</td>
    <td>✅</td>
    <td>❌</td>
    <td>`UNSTRUCTURED_API_KEY`</td>
</tr>
</table>

- LLMS are instructed to use the following [system prompts](./src/models/shared/prompt.ts) for OCR and JSON extraction.
- For Google Document AI, you need to include `google_credentials.json` in the `data` folder.

## Benchmark Dashboard

![dashboard](./assets/dashboard-gif.gif)

You can use benchmark dashboard to easily view the results of each test run. Check out the [dashboard documentation](dashboard/README.md) for more details.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
