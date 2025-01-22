import streamlit as st
from utils.data_loader import load_results, format_timestamp
import json
from difflib import HtmlDiff
from utils.style import SIDEBAR_STYLE


st.set_page_config(page_title="Test Results", layout="wide")
st.markdown(SIDEBAR_STYLE, unsafe_allow_html=True)


def display_json_diff(test_case, container):
    """Display JSON differences in a readable format"""
    # First check for errors
    if "error" in test_case:
        container.subheader("Error Message")
        container.error(test_case["error"])
        return

    # If no errors, display JSON diff as before
    if "jsonDiff" in test_case or "fullJsonDiff" in test_case:
        container.subheader("JSON Differences")
        # Display diff stats
        stats = test_case["jsonDiffStats"]
        cols = container.columns(4)
        cols[0].metric("Additions", stats["additions"])
        cols[1].metric("Missing", stats["deletions"])
        cols[2].metric("Modifications", stats["modifications"])
        cols[3].metric("Total Changes", stats["total"])

        cols = container.columns(2)
        total_fields = test_case.get("jsonAccuracyResult", {}).get("totalFields", 0)
        cols[0].metric("Total Fields", total_fields)
        cols[1].metric("Accuracy", test_case.get("jsonAccuracy", 0))

        # Create tabs for different diff views
        tab_summary, tab_full, tab_ground_truth, tab_predicted = container.tabs(
            ["Summary Diff", "Full Diff", "Ground Truth", "Predicted"]
        )

        with tab_summary:
            if "jsonDiff" in test_case:
                tab_summary.json(test_case["jsonDiff"])
            else:
                tab_summary.warning("Summary diff not available")

        with tab_full:
            if "fullJsonDiff" in test_case:
                tab_full.json(test_case["fullJsonDiff"])
            else:
                tab_full.warning("Full diff not available")

        with tab_ground_truth:
            tab_ground_truth.json(test_case["trueJson"])

        with tab_predicted:
            tab_predicted.json(test_case["predictedJson"])


def display_file_preview(test_case, container):
    """Display the original file preview"""
    container.subheader("File Preview")
    if "fileUrl" in test_case:
        container.image(test_case["fileUrl"], width=700)
    else:
        container.warning("No file preview available")


def display_markdown_diff(test_case):
    """Display markdown differences in a side-by-side view"""
    if "trueMarkdown" in test_case and "predictedMarkdown" in test_case:
        st.subheader("Markdown Differences")

        # Create HTML diff
        differ = HtmlDiff()
        diff_html = differ.make_file(
            test_case["trueMarkdown"].splitlines(),
            test_case["predictedMarkdown"].splitlines(),
            fromdesc="True Markdown",
            todesc="Predicted Markdown",
        )

        # Display side-by-side view
        st.markdown("### Side by Side Comparison")
        cols = st.columns(2)
        with cols[0]:
            st.markdown("**True Markdown**")
            st.text_area("", test_case["trueMarkdown"], height=400)
        with cols[1]:
            st.markdown("**Predicted Markdown**")
            st.text_area("", test_case["predictedMarkdown"], height=400)

        # Display HTML diff (optional, behind expander)
        with st.expander("View HTML Diff"):
            st.components.v1.html(diff_html, height=600, scrolling=True)


def main():
    st.title("Test Results")

    # Load results
    results_dict = load_results()

    if not results_dict:
        st.warning("No results found in the results directory.")
        return

    # 1. Select which test run (timestamp)
    col1, col2 = st.columns(2)
    with col1:
        timestamps = list(results_dict.keys())
        selected_timestamp = st.selectbox(
            "Select Test Run", timestamps, format_func=format_timestamp
        )

    # 2. Filter test cases for ones that have a non-empty JSON diff
    #    i.e. test["jsonDiffStats"]["total"] > 0
    all_test_cases = results_dict[selected_timestamp]
    results_with_diffs = [
        test
        for test in all_test_cases
        if test.get("jsonDiffStats", {}).get("total", 0) > 0
    ]

    if not results_with_diffs:
        # If no test cases have any JSON differences, let the user know
        st.warning("No test cases have JSON differences for this run.")
        return

    # 3. Build the dropdown items from only those filtered test cases
    test_case_labels = [
        f"{test['ocrModel']} → {test['extractionModel']}" for test in results_with_diffs
    ]
    with col2:
        selected_test_idx = st.selectbox(
            "Select Test Case (Only Cases with Differences)",
            range(len(test_case_labels)),
            format_func=lambda x: test_case_labels[x],
        )

    # 4. Display the selected test case
    test_case = results_with_diffs[selected_test_idx]

    # Display file URL
    st.markdown(f"**File URL:** [{test_case['fileUrl']}]({test_case['fileUrl']})")

    # Create two columns for file preview and JSON diff
    left_col, right_col = st.columns(2)

    # Display file preview on the left
    with left_col:
        display_file_preview(test_case, left_col)

    # Display JSON diff on the right
    with right_col:
        display_json_diff(test_case, right_col)

    # Display markdown diff at the bottom
    st.markdown("---")  # Add a separator
    display_markdown_diff(test_case)


if __name__ == "__main__":
    main()
