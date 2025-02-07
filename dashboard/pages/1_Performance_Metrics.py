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
            "Metadata": test.get("metadata"),
        }
        rows.append(row)

    return pd.DataFrame(rows)


def create_model_comparison_table(results):
    """Create a DataFrame comparing different model combinations"""
    model_stats = {}

    for test in results:
        if "error" in test:
            continue

        model_key = (
            f"{test['extractionModel']} (IMG2JSON)"
            if test.get("directImageExtraction", False)
            else f"{test['ocrModel']} → {test['extractionModel']}"
        )
        if model_key not in model_stats:
            model_stats[model_key] = {
                "count": 0,
                "json_accuracy": 0,
                "text_accuracy": 0,
                "total_cost": 0,
                "ocr_cost": 0,
                "extraction_cost": 0,
                "ocr_latency": 0,
                "extraction_latency": 0,
                "extraction_count": 0,
                "ocr_input_tokens": 0,
                "ocr_output_tokens": 0,
                "extraction_input_tokens": 0,
                "extraction_output_tokens": 0,
            }

        stats = model_stats[model_key]
        stats["count"] += 1
        stats["text_accuracy"] += test.get("levenshteinDistance", 0)
        stats["total_cost"] += test["usage"]["totalCost"]
        stats["ocr_cost"] += test["usage"].get("ocr", {}).get("totalCost", 0)
        stats["ocr_latency"] += test["usage"].get("ocr", {}).get("duration", 0) / 1000
        stats["ocr_input_tokens"] += test["usage"].get("ocr", {}).get("inputTokens", 0)
        stats["ocr_output_tokens"] += (
            test["usage"].get("ocr", {}).get("outputTokens", 0)
        )

        # Add token counting
        if "extraction" in test["usage"]:
            stats["extraction_input_tokens"] += test["usage"]["extraction"].get(
                "inputTokens", 0
            )
            stats["extraction_output_tokens"] += test["usage"]["extraction"].get(
                "outputTokens", 0
            )

        # Only add JSON accuracy and extraction stats if extraction was performed
        if "jsonAccuracy" in test and test["usage"].get("extraction"):
            stats["extraction_count"] += 1
            stats["json_accuracy"] += test["jsonAccuracy"]
            stats["extraction_cost"] += test["usage"]["extraction"].get("totalCost", 0)
            stats["extraction_latency"] += (
                test["usage"]["extraction"].get("duration", 0) / 1000
            )

    # Calculate averages
    for stats in model_stats.values():
        stats["text_accuracy"] /= stats["count"]
        stats["ocr_latency"] /= stats["count"]
        stats["ocr_cost"] /= stats["count"]
        stats["total_cost"] /= stats["count"]
        stats["ocr_input_tokens"] /= stats["count"]
        stats["ocr_output_tokens"] /= stats["count"]

        # Calculate extraction-related averages only if there were extractions
        if stats["extraction_count"] > 0:
            stats["json_accuracy"] /= stats["extraction_count"]
            stats["extraction_latency"] /= stats["extraction_count"]
            stats["extraction_cost"] /= stats["extraction_count"]
            stats["extraction_input_tokens"] /= stats["extraction_count"]
            stats["extraction_output_tokens"] /= stats["extraction_count"]

    # Convert to DataFrame
    df = pd.DataFrame.from_dict(model_stats, orient="index")
    df.index.name = "Model Combination"
    return df


def create_accuracy_comparison_charts(results):
    """Create separate DataFrames for JSON and Text accuracy comparisons"""
    model_accuracies = {}

    for test in results:
        if "error" in test:
            continue

        model_key = (
            f"{test['extractionModel']} (IMG2JSON)"
            if test.get("directImageExtraction", False)
            else f"{test['ocrModel']} → {test['extractionModel']}"
        )
        if model_key not in model_accuracies:
            model_accuracies[model_key] = {
                "count": 0,
                "json_accuracy": 0,
                "text_similarity": 0,
                "total_matched_items": 0,
                "total_items": 0,
                "extraction_count": 0,
            }

        stats = model_accuracies[model_key]
        stats["count"] += 1
        stats["text_similarity"] += test.get("levenshteinDistance", 0)

        # Handle JSON accuracy if present
        if "jsonAccuracy" in test:
            stats["extraction_count"] += 1
            stats["json_accuracy"] += test["jsonAccuracy"]

    # Calculate final averages
    for stats in model_accuracies.values():
        stats["text_similarity"] /= stats["count"]

        # Calculate JSON accuracy only if there were extractions
        if stats["extraction_count"] > 0:
            stats["json_accuracy"] /= stats["extraction_count"]
        else:
            stats["json_accuracy"] = 0

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

    return json_df, text_df


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

    json_df, text_df = create_accuracy_comparison_charts(results)
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
        text_df.reset_index().sort_values("Text Similarity", ascending=False),
        x="Model",
        y="Text Similarity",
        title="Text Similarity by Model",
        height=600,
        color_discrete_sequence=["#636EFA"],
    )
    fig2.update_layout(showlegend=False)
    fig2.update_traces(texttemplate="%{y:.1%}", textposition="outside")
    st.plotly_chart(fig2)

    # Model Statistics Table
    st.header("Model Performance Statistics")
    model_stats = create_model_comparison_table(results)
    st.dataframe(
        model_stats.style.format(
            {
                "json_accuracy": "{:.2%}",
                "text_accuracy": "{:.2%}",
                "avg_latency": "{:.2f} s",
                "total_cost": "${:.4f}",
                "count": "{:.0f}",
            }
        )
    )

    # Cost and Latency Charts
    st.header("Cost and Latency Analysis")

    # Cost per document chart
    cost_df = pd.DataFrame(model_stats["total_cost"] * 1000).reset_index()
    cost_df.columns = ["Model", "Cost per 1,000 Pages"]
    fig4 = px.bar(
        cost_df.sort_values("Cost per 1,000 Pages", ascending=True),
        x="Model",
        y="Cost per 1,000 Pages",
        title="Cost per 1,000 Pages by Model Combination",
        height=600,
        color_discrete_sequence=["#EE553B"],
    )
    fig4.update_layout(showlegend=False)
    fig4.update_traces(texttemplate="$%{y:.2f}", textposition="outside")
    st.plotly_chart(fig4)

    # Create stacked bar chart for cost breakdown per document
    cost_breakdown_df = pd.DataFrame(
        {
            "Model": model_stats.index,
            "OCR": model_stats["ocr_cost"] * 1000,
            "Extraction": model_stats["extraction_cost"] * 1000,
        }
    )

    # Calculate cost per 1k documents for sorting
    cost_breakdown_df["Total"] = (
        cost_breakdown_df["OCR"] + cost_breakdown_df["Extraction"]
    )
    fig_cost = px.bar(
        cost_breakdown_df.sort_values("Total", ascending=True),
        x="Model",
        y=["OCR", "Extraction"],
        title="Cost per 1,000 Pages Breakdown by Model Combination (OCR + Extraction)",
        height=600,
        color_discrete_sequence=["#636EFA", "#EF553B"],
    )
    fig_cost.update_layout(
        barmode="stack",
        showlegend=True,
        legend_title="Phase",
        yaxis=dict(
            title="Cost per 1,000 Pages (USD)",
            range=[
                0,
                cost_breakdown_df["Total"].max() * 1.2,
            ],
        ),
    )
    fig_cost.update_traces(texttemplate="$%{y:.2f}", textposition="inside")
    st.plotly_chart(fig_cost)

    # Create stacked bar chart for latency
    latency_df = pd.DataFrame(
        {
            "Model": model_stats.index,
            "OCR": model_stats["ocr_latency"],
            "Extraction": model_stats["extraction_latency"],
        }
    )

    # Calculate total latency for labels
    latency_df["Total"] = latency_df.get("OCR", 0) + latency_df.get("Extraction", 0)
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

    # Add new token usage chart at the bottom
    st.header("Token Usage Analysis")
    token_df = pd.DataFrame(
        {
            "Model": model_stats.index,
            "Input Tokens": model_stats["ocr_input_tokens"] / model_stats["count"],
            "Output Tokens": model_stats["ocr_output_tokens"] / model_stats["count"],
            "Extraction Input Tokens": model_stats["extraction_input_tokens"]
            / model_stats["count"],
            "Extraction Output Tokens": model_stats["extraction_output_tokens"]
            / model_stats["count"],
        }
    )

    # Calculate total tokens for sorting
    token_df["Total"] = (
        token_df["Input Tokens"]
        + token_df["Output Tokens"]
        + token_df["Extraction Input Tokens"]
        + token_df["Extraction Output Tokens"]
    )

    fig_tokens = px.bar(
        token_df.sort_values("Total", ascending=True),
        x="Model",
        y=[
            "Input Tokens",
            "Output Tokens",
            "Extraction Input Tokens",
            "Extraction Output Tokens",
        ],
        title="Average Token Usage per Document by Model Combination",
        height=600,
        color_discrete_sequence=["#636EFA", "#EF553B", "#7B83FB", "#F76D57"],
    )

    fig_tokens.update_layout(
        barmode="stack",
        showlegend=True,
        legend_title="Token Type",
        yaxis=dict(
            title="Number of Tokens",
            range=[0, token_df["Total"].max() * 1.2],
        ),
    )
    fig_tokens.update_traces(texttemplate="%{y:.0f}", textposition="inside")
    st.plotly_chart(fig_tokens)

    # Detailed Results Table
    st.header("Test Results")
    df = create_results_table(results)
    st.dataframe(df)


if __name__ == "__main__":
    main()
