"""
Data storage module for film data
Handles conversion to pandas DataFrames and file exports
"""

import os
from datetime import datetime
from typing import List, Optional
import pandas as pd


class FilmDataStorage:
    """Handles storage and export of film data"""

    def __init__(self, output_dir: str = "./output"):
        """
        Initialize storage handler

        Args:
            output_dir: Directory to save output files
        """
        self.output_dir = output_dir
        self._ensure_output_dir()

    def _ensure_output_dir(self):
        """Ensure output directory exists"""
        os.makedirs(self.output_dir, exist_ok=True)

    def create_dataframe(self, films: List[dict]) -> pd.DataFrame:
        """
        Convert film list to pandas DataFrame

        Args:
            films: List of film dictionaries

        Returns:
            Pandas DataFrame with film data
        """
        df = pd.DataFrame(films)

        # Ensure proper column order and include enrichment columns
        columns = [
            "movie_name",
            "release_year",
            "watch_date",
            "day_of_week",
            "rating",
            "film_path",
            # enrichment fields
            "actors",
            "avg_rating",
            "runtime",
            "poster_url",
            "directors",
            "writers",
            "editors",
            "cinematography",
            "language",
            "studio",
            "genres",
        ]

        # Reindex keeping any extra columns that might exist
        existing = [c for c in columns if c in df.columns]
        df = df.reindex(columns=existing)

        # Convert data types
        df["release_year"] = pd.to_numeric(df["release_year"], errors="coerce")
        df["rating"] = pd.to_numeric(df["rating"], errors="coerce")

        # Try to convert watch_date to datetime and extract day of week
        try:
            df["watch_date"] = pd.to_datetime(df["watch_date"], errors="coerce")
            # Add day of week column (returns full day name like "Monday", "Tuesday", etc.)
            df["day_of_week"] = df["watch_date"].dt.day_name()
        except Exception:
            # If datetime conversion failed, set day_of_week to None
            df["day_of_week"] = None

        return df

    def save_to_csv(self, df: pd.DataFrame, filename: Optional[str] = None) -> str:
        """
        Save DataFrame to CSV file

        Args:
            df: Pandas DataFrame
            filename: Optional custom filename (without extension)

        Returns:
            Path to saved file
        """
        if filename is None:
            filename = f"letterboxd_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        filepath = os.path.join(self.output_dir, f"{filename}.csv")
        df.to_csv(filepath, index=False)
        print(f"Saved to CSV: {filepath}")
        return filepath

    def save_to_json(self, df: pd.DataFrame, filename: Optional[str] = None) -> str:
        """
        Save DataFrame to JSON file

        Args:
            df: Pandas DataFrame
            filename: Optional custom filename (without extension)

        Returns:
            Path to saved file
        """
        if filename is None:
            filename = f"letterboxd_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        filepath = os.path.join(self.output_dir, f"{filename}.json")
        df.to_json(filepath, orient="records", indent=2)
        print(f"Saved to JSON: {filepath}")
        return filepath

    def save_dataframe(
        self,
        df: pd.DataFrame,
        format: str = "csv",
        filename: Optional[str] = None,
    ) -> str:
        """
        Save DataFrame in specified format

        Args:
            df: Pandas DataFrame
            format: Output format ('csv', 'json', or 'both')
            filename: Optional custom filename (without extension)

        Returns:
            Path to saved file(s)
        """
        if format.lower() == "csv":
            return self.save_to_csv(df, filename)
        elif format.lower() == "json":
            return self.save_to_json(df, filename)
        elif format.lower() == "both":
            csv_path = self.save_to_csv(df, filename)
            json_path = self.save_to_json(df, filename)
            return f"{csv_path}, {json_path}"
        else:
            raise ValueError(f"Unsupported format: {format}")

    @staticmethod
    def display_dataframe(df: pd.DataFrame):
        """
        Display DataFrame in console (useful for debugging)

        Args:
            df: Pandas DataFrame
        """
        pd.set_option("display.max_columns", None)
        pd.set_option("display.max_rows", None)
        pd.set_option("display.width", None)
        print("\n" + "=" * 100)
        print(f"Total Films: {len(df)}")
        print("=" * 100)
        print(df.to_string())
        print("=" * 100 + "\n")
