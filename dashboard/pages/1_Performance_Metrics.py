import streamlit as st
from datetime import datetime
import plotly.express as px
import pandas as pd

from utils.data_loader import load_results
from utils.style import SIDEBAR_STYLE

st.set_page_config(page_title="Performance Metrics")
st.markdown(SIDEBAR_STYLE, unsafe_allow_html=True)


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
                "ocr_latency": 0,
                "extraction_latency": 0,
                "extraction_count": 0,
            }

        stats = model_stats[model_key]
        stats["count"] += 1
        stats["text_accuracy"] += test["levenshteinDistance"]
        stats["total_cost"] += test["usage"]["totalCost"]
        stats["ocr_latency"] += (
            test["usage"]["ocr"]["duration"] / 1000
        )  # Convert ms to seconds

        # Only add JSON accuracy and extraction latency if extraction was performed
        if "jsonAccuracy" in test and test["usage"].get("extraction"):
            stats["extraction_count"] += 1
            stats["json_accuracy"] += test["jsonAccuracy"]
            stats["extraction_latency"] += (
                test["usage"]["extraction"]["duration"] / 1000
            )

    # Calculate averages
    for stats in model_stats.values():
        stats["text_accuracy"] /= stats["count"]
        stats["ocr_latency"] /= stats["count"]

        # Calculate extraction-related averages only if there were extractions
        if stats["extraction_count"] > 0:
            stats["json_accuracy"] /= stats["extraction_count"]
            stats["extraction_latency"] /= stats["extraction_count"]

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
                "total_matched_items": 0,
                "total_items": 0,
                "array_count": 0,
                "extraction_count": 0,
            }

        stats = model_accuracies[model_key]
        stats["count"] += 1
        stats["text_similarity"] += test["levenshteinDistance"]

        # Handle JSON accuracy if present
        if "jsonAccuracy" in test:
            stats["extraction_count"] += 1
            stats["json_accuracy"] += test["jsonAccuracy"]

        # Handle array accuracies if present
        if "arrayAccuracies" in test and test["arrayAccuracies"]:
            stats["array_count"] += 1
            # Sum up matchedItems and totalItems for all arrays in the test
            for array_result in test["arrayAccuracies"].values():
                stats["total_matched_items"] += array_result["matchedItems"]
                stats["total_items"] += array_result["totalItems"]

    # Calculate final averages
    for stats in model_accuracies.values():
        stats["text_similarity"] /= stats["count"]

        # Calculate JSON accuracy only if there were extractions
        if stats["extraction_count"] > 0:
            stats["json_accuracy"] /= stats["extraction_count"]
        else:
            stats["json_accuracy"] = 0

        # Calculate array accuracy only if there were arrays
        stats["array_accuracy"] = (
            stats["total_matched_items"] / stats["total_items"]
            if stats["total_items"] > 0
            else 0
        )

    # Create DataFrames
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
    st.title("Performance Metrics")

    # Load results and create dropdown
    results_dict = load_results()

    if not results_dict:
        st.warning("No results found in the results directory.")
        return

    # Rest of your existing main() function code...

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
        color_discrete_sequence=["#636EFA"],
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
        color_discrete_sequence=["#636EFA"],
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
        color_discrete_sequence=["#636EFA"],
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
        color_discrete_sequence=["#EE553B"],
    )
    fig4.update_layout(showlegend=False)
    fig4.update_traces(texttemplate="$%{y:.4f}", textposition="outside")
    st.plotly_chart(fig4)

    # Create stacked bar chart for latency
    latency_df = pd.DataFrame(
        {
            "Model": model_stats.index,
            "OCR": model_stats["ocr_latency"],
            "Extraction": model_stats["extraction_latency"],
        }
    )

    # Calculate total latency for labels
    latency_df["Total"] = latency_df["OCR"] + latency_df["Extraction"]
    fig5 = px.bar(
        latency_df.sort_values("Total", ascending=True),
        x="Model",
        y=["OCR", "Extraction"],
        title="Latency by Model Combination (OCR + Extraction)",
        height=600,
        color_discrete_sequence=["#636EFA", "#EF553B"],
    )
    fig5.update_layout(
        barmode="stack",
        showlegend=True,
        legend_title="Phase",
        yaxis=dict(
            range=[
                0,
                latency_df["Total"].max() * 1.2,
            ]  # Set y-axis range to 120% of max value
        ),
    )
    fig5.update_traces(texttemplate="%{y:.2f}s", textposition="inside")
    st.plotly_chart(fig5)

    # Total latency chart
    total_latency_df = pd.DataFrame(
        {
            "Model": model_stats.index,
            "Total Latency": model_stats["ocr_latency"]
            + model_stats["extraction_latency"],
        }
    )
    fig6 = px.bar(
        total_latency_df.sort_values("Total Latency", ascending=True),
        x="Model",
        y="Total Latency",
        title="Total Latency by Model Combination",
        height=600,
        color_discrete_sequence=["#636EFA"],
    )
    fig6.update_layout(showlegend=False)
    fig6.update_traces(texttemplate="%{y:.2f}s", textposition="outside")
    st.plotly_chart(fig6)

    # Detailed Results Table
    st.header("Test Results")
    df = create_results_table(results)
    st.dataframe(df)


if __name__ == "__main__":
    main()
