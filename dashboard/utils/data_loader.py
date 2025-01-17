from datetime import datetime
import json
from pathlib import Path
import pandas as pd


def load_results(results_dir="results"):
    """Load all result JSON files from the results directory"""
    results_path = Path(results_dir)
    result_dirs = [d for d in results_path.iterdir() if d.is_dir()]
    results_dict = {}

    for dir_path in result_dirs:
        timestamp = dir_path.name
        json_path = dir_path / "results.json"
        if json_path.exists():
            with open(json_path) as f:
                results = json.load(f)
                results_dict[timestamp] = results

    results_dict = dict(sorted(results_dict.items(), reverse=True))
    return results_dict


def format_timestamp(timestamp):
    return datetime.strptime(timestamp, "%Y-%m-%d-%H-%M-%S").strftime(
        "%Y-%m-%d %H:%M:%S"
    )
