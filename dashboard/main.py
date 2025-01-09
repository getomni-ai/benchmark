from datetime import datetime
import json
from pathlib import Path
import plotly.express as px
import pandas as pd
import streamlit as st

# st.set_page_config(layout="wide")


def load_results(results_dir="results"):
    """Load all result JSON files from the results directory"""
    results_path = Path(results_dir)
    # Look for subdirectories that contain results.json
    result_dirs = [d for d in results_path.iterdir() if d.is_dir()]
    results_dict = {}

    for dir_path in result_dirs:
        timestamp = dir_path.name  # Get directory name as timestamp
        json_path = dir_path / "results.json"
        if json_path.exists():
            with open(json_path) as f:
                results = json.load(f)
                results_dict[timestamp] = results

    return results_dict


def display_metrics(results):
    """Display key metrics in Streamlit"""
    metrics = calculate_metrics(results)

    col1, col2 = st.columns(2)

    with col1:
        st.metric("JSON Accuracy", f"{metrics['accuracy']['json_accuracy']:.2%}")
        st.metric("Text Accuracy", f"{metrics['accuracy']['text_accuracy']:.2%}")

    with col2:
        st.metric(
            "Average Latency", f"{metrics['latency']['average_latency']:.2f} seconds"
        )
        st.metric("Total Cost", f"${metrics['cost']['total_cost']:.4f}")


def create_results_table(results):
    """Create a DataFrame from test results"""
    rows = []

    for test in results:  # Results is a list of test cases
        row = {
            "Image": test["fileUrl"],
            "OCR Model": test["ocrModel"],
            "Extraction Model": test["extractionModel"],
            "Levenshtein Score": test.get("levenshteinDistance"),
            "JSON Accuracy": test.get("jsonAccuracy"),
            "Total Cost": test.get("usage", {}).get("totalCost"),
            "Duration (ms)": test.get("usage", {}).get("duration"),
        }
        rows.append(row)

    return pd.DataFrame(rows)


def calculate_metrics(results):
    """Calculate average metrics from results"""
    metrics = {
        "accuracy": {
            "json_accuracy": sum(test["jsonAccuracy"] for test in results)
            / len(results),
            "text_accuracy": sum(test["levenshteinDistance"] for test in results)
            / len(results),
        },
        "latency": {
            "average_latency": sum(test["usage"]["duration"] for test in results)
            / len(results)
            / 1000  # Convert to seconds
        },
        "cost": {"total_cost": sum(test["usage"]["totalCost"] for test in results)},
    }
    return metrics


def create_model_comparison_table(results):
    """Create a DataFrame comparing different model combinations"""
    model_stats = {}

    for test in results:
        if "error" in test:
            continue

        model_key = f"{test['ocrModel']} → {test['extractionModel']}"
        if model_key not in model_stats:
            model_stats[model_key] = {
                "count": 0,
                "json_accuracy": 0,
                "text_accuracy": 0,
                "total_cost": 0,
                "avg_latency": 0,
            }

        stats = model_stats[model_key]
        stats["count"] += 1
        stats["json_accuracy"] += test["jsonAccuracy"]
        stats["text_accuracy"] += test["levenshteinDistance"]
        stats["total_cost"] += test["usage"]["totalCost"]
        stats["avg_latency"] += (
            test["usage"]["duration"] / 1000
        )  # Convert ms to seconds

    # Calculate averages
    for stats in model_stats.values():
        stats["json_accuracy"] /= stats["count"]
        stats["text_accuracy"] /= stats["count"]
        stats["avg_latency"] /= stats["count"]

    # Convert to DataFrame
    df = pd.DataFrame.from_dict(model_stats, orient="index")
    df.index.name = "Model Combination"
    return df


def create_accuracy_comparison_charts(results):
    """Create separate DataFrames for JSON, Text, and Array accuracy comparisons"""
    model_accuracies = {}

    for test in results:
        if "error" in test:
            continue

        model_key = f"{test['ocrModel']} → {test['extractionModel']}"
        if model_key not in model_accuracies:
            model_accuracies[model_key] = {
                "count": 0,
                "json_accuracy": 0,
                "text_similarity": 0,
                "array_accuracy": 0,
                "array_count": 0,
            }

        stats = model_accuracies[model_key]
        stats["count"] += 1
        stats["json_accuracy"] += test["jsonAccuracy"]
        stats["text_similarity"] += test["levenshteinDistance"]

        # Handle array accuracies if present
        if "arrayAccuracies" in test and test["arrayAccuracies"]:
            stats["array_count"] += 1
            # Average all array scores in the test
            array_scores = [v["score"] for v in test["arrayAccuracies"].values()]
            stats["array_accuracy"] += sum(array_scores) / len(array_scores)

    # Calculate averages
    for stats in model_accuracies.values():
        stats["json_accuracy"] /= stats["count"]
        stats["text_similarity"] /= stats["count"]
        if stats["array_count"] > 0:
            stats["array_accuracy"] /= stats["array_count"]

    # Create separate DataFrames for each metric
    json_df = pd.DataFrame(
        {
            "Model": model_accuracies.keys(),
            "JSON Accuracy": [
                stats["json_accuracy"] for stats in model_accuracies.values()
            ],
        }
    ).set_index("Model")

    text_df = pd.DataFrame(
        {
            "Model": model_accuracies.keys(),
            "Text Similarity": [
                stats["text_similarity"] for stats in model_accuracies.values()
            ],
        }
    ).set_index("Model")

    array_df = pd.DataFrame(
        {
            "Model": model_accuracies.keys(),
            "Array Accuracy": [
                stats["array_accuracy"] for stats in model_accuracies.values()
            ],
        }
    ).set_index("Model")

    return json_df, text_df, array_df


def main():
    st.title("OCR Benchmark Dashboard")

    # Load all results from the results directory
    results_dict = load_results()

    if not results_dict:
        st.warning("No results found in the results directory.")
        return

    # Create a dropdown to select the test run
    timestamps = list(results_dict.keys())
    selected_timestamp = st.selectbox(
        "Select Test Run",
        timestamps,
        format_func=lambda x: datetime.strptime(x, "%Y-%m-%d-%H-%M-%S").strftime(
            "%Y-%m-%d %H:%M:%S"
        ),
    )

    results = results_dict[selected_timestamp]

    # Accuracy Charts
    st.header("Evaluation Metrics by Model")

    json_df, text_df, array_df = create_accuracy_comparison_charts(results)
    fig1 = px.bar(
        json_df.reset_index().sort_values("JSON Accuracy", ascending=False),
        x="Model",
        y="JSON Accuracy",
        title="JSON Accuracy by Model",
        height=600,
    )
    fig1.update_layout(showlegend=False)
    fig1.update_traces(texttemplate="%{y:.1%}", textposition="outside")
    st.plotly_chart(fig1)

    fig2 = px.bar(
        array_df.reset_index().sort_values("Array Accuracy", ascending=False),
        x="Model",
        y="Array Accuracy",
        title="Array Accuracy by Model",
        height=600,
    )
    fig2.update_layout(showlegend=False)
    fig2.update_traces(texttemplate="%{y:.1%}", textposition="outside")
    st.plotly_chart(fig2)

    fig3 = px.bar(
        text_df.reset_index().sort_values("Text Similarity", ascending=False),
        x="Model",
        y="Text Similarity",
        title="Text Similarity by Model",
        height=600,
    )
    fig3.update_layout(showlegend=False)
    fig3.update_traces(texttemplate="%{y:.1%}", textposition="outside")
    st.plotly_chart(fig3)

    # Model Statistics Table
    st.header("Model Performance Statistics")
    model_stats = create_model_comparison_table(results)
    st.dataframe(
        model_stats.style.format(
            {
                "json_accuracy": "{:.2%}",
                "text_accuracy": "{:.2%}",
                "array_accuracy": "{:.2%}",
                "avg_latency": "{:.2f} s",
                "total_cost": "${:.4f}",
                "count": "{:.0f}",
            }
        )
    )

    # Cost and Latency Charts
    st.header("Cost and Latency Analysis")

    cost_df = pd.DataFrame(model_stats["total_cost"]).reset_index()
    cost_df.columns = ["Model", "Total Cost"]
    fig4 = px.bar(
        cost_df.sort_values("Total Cost", ascending=True),
        x="Model",
        y="Total Cost",
        title="Total Cost by Model Combination",
        height=600,
    )
    fig4.update_layout(showlegend=False)
    fig4.update_traces(texttemplate="$%{y:.4f}", textposition="outside")
    st.plotly_chart(fig4)

    latency_df = pd.DataFrame(model_stats["avg_latency"]).reset_index()
    latency_df.columns = ["Model", "Average Latency"]
    fig5 = px.bar(
        latency_df.sort_values("Average Latency", ascending=True),
        x="Model",
        y="Average Latency",
        title="Average Latency by Model Combination",
        height=600,
    )
    fig5.update_layout(showlegend=False)
    fig5.update_traces(texttemplate="%{y:.2f} s", textposition="outside")
    st.plotly_chart(fig5)

    # Detailed Results Table
    st.header("Test Results")
    df = create_results_table(results)
    st.dataframe(df)


if __name__ == "__main__":
    main()
