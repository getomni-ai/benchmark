import streamlit as st
from utils.data_loader import load_results, format_timestamp
import json
from difflib import HtmlDiff
from utils.style import SIDEBAR_STYLE


st.set_page_config(page_title="Error Analysis", layout="wide")
st.markdown(SIDEBAR_STYLE, unsafe_allow_html=True)


def display_json_diff(test_case, container):
    """Display JSON differences in a readable format"""
    if "jsonDiff" in test_case:
        container.subheader("JSON Differences")

        # Display diff stats
        stats = test_case["jsonDiffStats"]
        cols = container.columns(4)
        cols[0].metric("Additions", stats["additions"])
        cols[1].metric("Deletions", stats["deletions"])
        cols[2].metric("Modifications", stats["modifications"])
        cols[3].metric("Total Changes", stats["total"])

        # Display detailed diff
        container.json(test_case["jsonDiff"])


def display_file_preview(test_case, container):
    """Display the original file preview"""
    container.subheader("File Preview")
    if "fileUrl" in test_case:
        container.image(test_case["fileUrl"], width=400)
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
    st.title("Error Analysis")

    # Load results
    results_dict = load_results()

    if not results_dict:
        st.warning("No results found in the results directory.")
        return

    # Create dropdowns for test run and test case selection
    col1, col2 = st.columns(2)
    with col1:
        timestamps = list(results_dict.keys())
        selected_timestamp = st.selectbox(
            "Select Test Run", timestamps, format_func=format_timestamp
        )

    results = results_dict[selected_timestamp]

    with col2:
        test_cases = [
            f"{test['ocrModel']} → {test['extractionModel']}" for test in results
        ]
        selected_test_idx = st.selectbox(
            "Select Test Case",
            range(len(test_cases)),
            format_func=lambda x: test_cases[x],
        )

    # Display selected test case details
    test_case = results[selected_test_idx]

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
