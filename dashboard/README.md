# OCR Benchmark Dashboard

![dashboard](../assets/dashboard-gif.gif)

This dashboard is used to view the results of the OCR Benchmark.

## Getting started

1. Create a virtual environment

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```

2. Install python dependencies

    ```bash
    pip install -r requirements.txt
    ```

3. Run the dashboard:

    ```bash
    streamlit run dashboard/Home.py
    ```

4. The dashboard will open in your browser and show:
   - Model comparison charts for JSON accuracy, and text similarity
   - Cost and latency charts for each model
   - Detailed performance statistics for each model combination
   - Test results table with individual test cases

The dashboard automatically loads results from your `results` folder and lets you switch between different test runs .
