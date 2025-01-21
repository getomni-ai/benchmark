import streamlit as st

from utils.style import SIDEBAR_STYLE

st.set_page_config(
    page_title="OCR Benchmark Dashboard",
)
st.markdown(SIDEBAR_STYLE, unsafe_allow_html=True)

st.title("OCR Benchmark Dashboard")
st.markdown(
    """
Welcome to the OCR Benchmark Dashboard! This tool helps analyze and visualize OCR and extraction model performance.

### Available Pages:
- **Performance Metrics**: View detailed performance metrics, costs, and latency analysis
- **Test Results**: View detailed test results

Choose a page from the sidebar to get started.
"""
)
