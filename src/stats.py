"""
Stats collection and reporting module
Provides extensible stat aggregation for film data analysis
"""

from typing import List, Dict, Tuple, Optional
import math
import pandas as pd


class StatCollector:
    """Extensible stats collector for film data"""

    def __init__(self, df: pd.DataFrame):
        """
        Initialize with film dataframe

        Args:
            df: Pandas DataFrame with film data (must have rating column)
        """
        # Keep original dataframe and also a deduplicated view where each movie
        # appears only once using the highest rating you gave it.
        self.df = df.copy()
        self.stats = {}

        # Compute rewatch counts from the original dataframe (how many times each movie was watched)
        if "movie_name" in self.df.columns:
            self.rewatch_counts = self.df.groupby("movie_name").size().to_dict()
        else:
            self.rewatch_counts = {}

        # Create a deduplicated dataframe: for each movie_name keep the row with the highest rating.
        # Ratings may be NaN; treat NaN as lowest when choosing the highest-rated instance.
        if "movie_name" in self.df.columns:
            tmp = self.df.copy()
            tmp["_rating_sort"] = tmp["rating"].fillna(-1)
            tmp = tmp.sort_values(["movie_name", "_rating_sort"], ascending=[True, False])
            self.df_unique = tmp.drop_duplicates(subset=["movie_name"], keep="first").drop(columns=["_rating_sort"], errors="ignore").reset_index(drop=True)
        else:
            self.df_unique = self.df.copy()

    def aggregate_list_field(
        self,
        field_name: str,
        metric_name: Optional[str] = None,
    ) -> Dict[str, dict]:
        """
        Aggregate a list field (e.g., actors, genres, directors)
        Returns {item: {count, avg_rating}}

        Args:
            field_name: Column name containing lists (e.g., 'actors', 'genres')
            metric_name: Name for this stat (defaults to field_name)

        Returns:
            Dict mapping item to {count, avg_rating}
        """
        if metric_name is None:
            metric_name = field_name

        # Aggregate using the deduplicated dataframe so repeated diary entries do not double-count
        aggregated = {}
        for _, row in self.df_unique.iterrows():
            items = row.get(field_name) or []
            rating = row.get("rating")

            # Handle string items (comma/semicolon separated) or actual lists
            if isinstance(items, str):
                items = [x.strip() for x in items.split(";")]

            for item in items:
                if not item or (isinstance(item, float) and pd.isna(item)):
                    continue

                if item not in aggregated:
                    aggregated[item] = {"count": 0, "ratings": []}

                aggregated[item]["count"] += 1
                if not pd.isna(rating):
                    aggregated[item]["ratings"].append(rating)

        # Calculate avg_rating for each item
        for item, data in aggregated.items():
            ratings = data.pop("ratings", [])
            data["avg_rating"] = sum(ratings) / len(ratings) if ratings else None

        self.stats[metric_name] = aggregated
        return aggregated

    def aggregate_single_field(
        self,
        field_name: str,
        metric_name: Optional[str] = None,
    ) -> Dict[str, dict]:
        """
        Aggregate a single-value field (e.g., language, studio)
        Returns {value: {count, avg_rating}}

        Args:
            field_name: Column name with single values
            metric_name: Name for this stat (defaults to field_name)

        Returns:
            Dict mapping value to {count, avg_rating}
        """
        if metric_name is None:
            metric_name = field_name

        # Use deduplicated dataframe for counts/ratings
        aggregated = {}
        for _, row in self.df_unique.iterrows():
            value = row.get(field_name)
            rating = row.get("rating")

            if pd.isna(value) or value is None or value == "":
                continue

            if value not in aggregated:
                aggregated[value] = {"count": 0, "ratings": []}

            aggregated[value]["count"] += 1
            if not pd.isna(rating):
                aggregated[value]["ratings"].append(rating)

        # Calculate avg_rating for each value
        for value, data in aggregated.items():
            ratings = data.pop("ratings", [])
            data["avg_rating"] = sum(ratings) / len(ratings) if ratings else None

        self.stats[metric_name] = aggregated
        return aggregated

    def _weighted_average_score(self, avg_rating: float, count: int) -> float:
        """
        Weighted Average: Score = (Average rating) × log(count + 1)
        
        Args:
            avg_rating: Average rating of the item
            count: Number of appearances
            
        Returns:
            Weighted average score
        """
        if avg_rating is None or count == 0:
            return 0.0
        return avg_rating * math.log(count + 1)

    def _bayesian_average_score(
        self, avg_rating: float, count: int, c: int = 3, m: float = 3.0
    ) -> float:
        """
        Bayesian Average: Score = (count × avg_rating + c × m) / (count + c)
        Where c is the confidence/sample size threshold and m is the mean rating
        
        Args:
            avg_rating: Average rating of the item
            count: Number of appearances
            c: Minimum required appearances (confidence parameter)
            m: Mean rating to use as prior
            
        Returns:
            Bayesian average score
        """
        if avg_rating is None or count == 0:
            return 0.0
        return (count * avg_rating + c * m) / (count + c)

    def _wilson_score(
        self, avg_rating: float, count: int, z: float = 1.96
    ) -> float:
        """
        Wilson Score: Lower bound of Wilson confidence interval
        Useful for ranking with confidence when sample size varies
        
        Normalized to 0-5 scale based on rating scale
        
        Args:
            avg_rating: Average rating of the item
            count: Number of appearances
            z: Z-score for confidence level (1.96 = 95%, 1.645 = 90%)
            
        Returns:
            Wilson score (0-5 scale)
        """
        if count == 0:
            return 0.0
        
        # Normalize rating to 0-1 scale for Wilson calculation
        p_hat = avg_rating / 5.0
        
        # Wilson score interval lower bound
        denominator = 1 + z * z / count
        center = (p_hat + z * z / (2 * count)) / denominator
        margin = z * math.sqrt(p_hat * (1 - p_hat) / count + z * z / (4 * count * count)) / denominator
        wilson = center - margin
        
        # Scale back to 0-5 rating scale
        return max(0, min(5, wilson * 5.0))

    def top_by_weighted_average(
        self,
        metric_name: str,
        n: int = 3,
    ) -> List[Tuple[str, float, int, float]]:
        """
        Get top N items by weighted average score

        Args:
            metric_name: Name of metric to query
            n: Number of top items to return

        Returns:
            List of (item, score, count, avg_rating) tuples
        """
        if metric_name not in self.stats:
            return []

        aggregated = self.stats[metric_name]
        items = [
            (
                item,
                self._weighted_average_score(data["avg_rating"], data["count"]),
                data["count"],
                data["avg_rating"],
            )
            for item, data in aggregated.items()
            if data.get("avg_rating") is not None
        ]

        return sorted(items, key=lambda x: x[1], reverse=True)[:n]

    def top_by_bayesian_average(
        self,
        metric_name: str,
        n: int = 3,
    ) -> List[Tuple[str, float, int, float]]:
        """
        Get top N items by Bayesian average score

        Args:
            metric_name: Name of metric to query
            n: Number of top items to return

        Returns:
            List of (item, score, count, avg_rating) tuples
        """
        if metric_name not in self.stats:
            return []

        aggregated = self.stats[metric_name]
        items = [
            (
                item,
                self._bayesian_average_score(data["avg_rating"], data["count"]),
                data["count"],
                data["avg_rating"],
            )
            for item, data in aggregated.items()
            if data.get("avg_rating") is not None
        ]

        return sorted(items, key=lambda x: x[1], reverse=True)[:n]

    def top_by_wilson_score(
        self,
        metric_name: str,
        n: int = 3,
    ) -> List[Tuple[str, float, int, float]]:
        """
        Get top N items by Wilson score

        Args:
            metric_name: Name of metric to query
            n: Number of top items to return

        Returns:
            List of (item, score, count, avg_rating) tuples
        """
        if metric_name not in self.stats:
            return []

        aggregated = self.stats[metric_name]
        items = [
            (
                item,
                self._wilson_score(data["avg_rating"], data["count"]),
                data["count"],
                data["avg_rating"],
            )
            for item, data in aggregated.items()
            if data.get("avg_rating") is not None
        ]

        return sorted(items, key=lambda x: x[1], reverse=True)[:n]

    def top_by_count(
        self,
        metric_name: str,
        n: int = 3,
    ) -> List[Tuple[str, int, Optional[float]]]:
        """
        Get top N items by count (most watched)

        Args:
            metric_name: Name of metric to query
            n: Number of top items to return

        Returns:
            List of (item, count, avg_rating) tuples
        """
        if metric_name not in self.stats:
            return []

        aggregated = self.stats[metric_name]
        items = [
            (
                item,
                data["count"],
                data.get("avg_rating"),
            )
            for item, data in aggregated.items()
        ]

        return sorted(items, key=lambda x: x[1], reverse=True)[:n]

    def print_metric(
        self,
        metric_name: str,
        n: int = 3,
        label: str = "",
    ):
        """
        Print formatted stats for a metric using all three scoring methods

        Args:
            metric_name: Name of metric to print
            n: Number of top items to show
            label: Custom label (defaults to metric_name)
        """
        if not label:
            label = metric_name.replace("_", " ").title()

        print(f"\n{label}")
        print("=" * 80)

        # Weighted Average Score
        print(f"\nWeighted Average (rating × log(count+1)):")
        top = self.top_by_weighted_average(metric_name, n)
        if top:
            for i, (item, score, count, avg_rating) in enumerate(top, 1):
                print(f"  {i}. {item}")
                print(f"     Score: {score:.2f} | Avg rating: {avg_rating:.2f} | Count: {count}")
        else:
            print("  (No data)")

        # Bayesian Average
        print(f"\nBayesian Average (count×rating + 3×3 / count+3):")
        top = self.top_by_bayesian_average(metric_name, n)
        if top:
            for i, (item, score, count, avg_rating) in enumerate(top, 1):
                print(f"  {i}. {item}")
                print(f"     Score: {score:.2f} | Avg rating: {avg_rating:.2f} | Count: {count}")
        else:
            print("  (No data)")

        # Wilson Score
        print(f"\nWilson Score (confidence interval lower bound):")
        top = self.top_by_wilson_score(metric_name, n)
        if top:
            for i, (item, score, count, avg_rating) in enumerate(top, 1):
                print(f"  {i}. {item}")
                print(f"     Score: {score:.2f} | Avg rating: {avg_rating:.2f} | Count: {count}")
        else:
            print("  (No data)")

    def print_all(self, n: int = 3):
        """
        Print all aggregated metrics in a formatted way

        Args:
            n: Number of top items to show for each metric
        """
        print("\n" + "=" * 80)
        print("FILM STATS SUMMARY")
        print("=" * 80)

        for metric_name in self.stats.keys():
            self.print_metric(metric_name, n=n)

        print("\n" + "=" * 80)

    def top_rewatched(self, n: int = 3) -> List[Dict]:
        """
        Return top N rewatched movies (by count of diary entries)
        Only includes movies watched more than once.

        Args:
            n: maximum number of movies to return

        Returns:
            List of dicts with {movie, count, poster_url}, filtered to only movies with count > 1
            Returns min(n, number of movies with count > 1) movies
        """
        # Filter out movies watched only once (count <= 1)
        items = [(movie, count) for movie, count in self.rewatch_counts.items() if count > 1]
        # Sort by count descending
        items = sorted(items, key=lambda x: x[1], reverse=True)[:n]
        
        # Get poster URLs from df_unique
        results = []
        for movie, count in items:
            poster_url = None
            if "poster_url" in self.df_unique.columns:
                movie_row = self.df_unique[self.df_unique["movie_name"] == movie]
                if len(movie_row) > 0:
                    poster_url = movie_row.iloc[0].get("poster_url")
                    if pd.isna(poster_url):
                        poster_url = None
            
            results.append({
                "movie": movie,
                "count": count,
                "poster_url": poster_url,
            })
        
        return results

    def top_rating_variance_movies(self, n: int = 3) -> List[Tuple[str, float, float, float]]:
        """
        Return top N movies with largest variance between your rating and letterboxd avg rating.
        Positive variance = you rated higher than average (overhyped).
        Negative variance = you rated lower than average (underhyped).

        Args:
            n: number of movies to return

        Returns:
            List of (movie_name, your_rating, avg_rating, variance) tuples, sorted by |variance| desc
        """
        movies = []
        for _, row in self.df_unique.iterrows():
            movie_name = row.get("movie_name")
            your_rating = row.get("rating")
            avg_rating = row.get("avg_rating")

            if pd.isna(your_rating) or pd.isna(avg_rating):
                continue

            variance = your_rating - avg_rating
            movies.append((movie_name, your_rating, avg_rating, variance))

        # Sort by absolute variance descending
        movies.sort(key=lambda x: abs(x[3]), reverse=True)
        return movies[:n]

    def director_rating_variance(self) -> Dict[str, dict]:
        """
        Aggregate rating variance by director.
        For each director, compute average variance across their films.

        Returns:
            Dict mapping director to {avg_variance, num_films}
        """
        director_data = {}

        for _, row in self.df_unique.iterrows():
            your_rating = row.get("rating")
            avg_rating = row.get("avg_rating")
            directors = row.get("directors") or []

            if pd.isna(your_rating) or pd.isna(avg_rating):
                continue

            # Handle string items (semicolon separated) or actual lists
            if isinstance(directors, str):
                directors = [x.strip() for x in directors.split(";")]

            variance = your_rating - avg_rating

            for director in directors:
                if not director:
                    continue

                if director not in director_data:
                    director_data[director] = {"variances": []}

                director_data[director]["variances"].append(variance)

        # Calculate average variance for each director
        for director, data in director_data.items():
            variances = data.pop("variances", [])
            data["avg_variance"] = sum(variances) / len(variances) if variances else 0.0
            data["num_films"] = len(variances)

        return director_data

    def top_overhyped_directors(self, n: int = 3, min_films: int = 1) -> List[Tuple[str, float, int, float]]:
        """
        Return top N directors you rated highest relative to their average.
        Positive variance = you rated them higher than the world.
        
        Uses a weighted score that biases toward directors with more films watched,
        reducing the dominance of single-film directors.
        Weighted score = avg_variance × sqrt(num_films)

        Args:
            n: number of directors to return
            min_films: minimum number of films by director to include (default 1)

        Returns:
            List of (director, avg_variance, num_films, weighted_score) tuples
        """
        director_data = self.director_rating_variance()
        items = []
        for dir_name, data in director_data.items():
            num_films = data["num_films"]
            if num_films < min_films:
                continue
            avg_var = data["avg_variance"]
            # Weighted score biases toward more films: multiply by sqrt(num_films)
            weighted_score = avg_var * math.sqrt(num_films)
            items.append((dir_name, avg_var, num_films, weighted_score))
        
        items.sort(key=lambda x: x[3], reverse=True)
        return items[:n]

    def top_underhyped_directors(self, n: int = 3, min_films: int = 1) -> List[Tuple[str, float, int, float]]:
        """
        Return top N directors you rated lowest relative to their average.
        Negative variance = you rated them lower than the world.
        
        Uses a weighted score that biases toward directors with more films watched,
        reducing the dominance of single-film directors.
        Weighted score = avg_variance × sqrt(num_films)

        Args:
            n: number of directors to return
            min_films: minimum number of films by director to include (default 1)

        Returns:
            List of (director, avg_variance, num_films, weighted_score) tuples
        """
        director_data = self.director_rating_variance()
        items = []
        for dir_name, data in director_data.items():
            num_films = data["num_films"]
            if num_films < min_films:
                continue
            avg_var = data["avg_variance"]
            # Weighted score biases toward more films: multiply by sqrt(num_films)
            # For underhyped we want most negative, so negate for sorting
            weighted_score = avg_var * math.sqrt(num_films)
            items.append((dir_name, avg_var, num_films, weighted_score))
        
        items.sort(key=lambda x: x[3], reverse=False)
        return items[:n]

    def get_cumulative_timeline(self) -> List[Dict]:
        """
        Get cumulative film count over time, sorted by watch_date.
        
        Returns:
            List of dicts with {date, cumulative_count, film_title} where:
            - date: ISO date string (YYYY-MM-DD)
            - cumulative_count: running total of films watched up to this date
            - film_title: name of film watched on this date
        """
        if "watch_date" not in self.df.columns:
            return []
        
        # Work with the original df (not deduplicated) to track actual watch events
        timeline_df = self.df[["watch_date", "movie_name"]].copy()
        
        # Drop rows with missing watch_date
        timeline_df = timeline_df.dropna(subset=["watch_date"])
        
        if len(timeline_df) == 0:
            return []
        
        # Convert watch_date to datetime for proper sorting
        timeline_df["watch_date"] = pd.to_datetime(timeline_df["watch_date"], errors="coerce")
        timeline_df = timeline_df.dropna(subset=["watch_date"])
        
        # Sort by watch_date
        timeline_df = timeline_df.sort_values("watch_date").reset_index(drop=True)
        
        # Build cumulative timeline
        timeline = []
        cumulative = 0
        
        for _, row in timeline_df.iterrows():
            cumulative += 1
            timeline.append({
                "date": row["watch_date"].strftime("%Y-%m-%d"),
                "cumulative_count": cumulative,
                "film_title": row["movie_name"] or "Unknown"
            })
        
        return timeline

    def get_cumulative_timeline_aggregated(self) -> List[Dict]:
        """
        Get cumulative film count over time, aggregated by date.
        Each date shows the cumulative total at end of that day.
        
        Returns:
            List of dicts with {date, cumulative_count, films_on_day} where:
            - date: ISO date string (YYYY-MM-DD)
            - cumulative_count: running total of films watched up to end of this date
            - films_on_day: number of films watched on this specific date
        """
        if "watch_date" not in self.df.columns:
            return []
        
        # Work with the original df to track actual watch events
        timeline_df = self.df[["watch_date", "movie_name"]].copy()
        
        # Drop rows with missing watch_date
        timeline_df = timeline_df.dropna(subset=["watch_date"])
        
        if len(timeline_df) == 0:
            return []
        
        # Convert watch_date to datetime
        timeline_df["watch_date"] = pd.to_datetime(timeline_df["watch_date"], errors="coerce")
        timeline_df = timeline_df.dropna(subset=["watch_date"])
        
        # Group by date and count films per day
        daily_counts = timeline_df.groupby(timeline_df["watch_date"].dt.date).size().reset_index(name="films_on_day")
        daily_counts.columns = ["date", "films_on_day"]
        daily_counts = daily_counts.sort_values("date").reset_index(drop=True)
        
        # Build cumulative timeline
        timeline = []
        cumulative = 0
        
        for _, row in daily_counts.iterrows():
            cumulative += row["films_on_day"]
            timeline.append({
                "date": str(row["date"]),
                "cumulative_count": cumulative,
                "films_on_day": int(row["films_on_day"])
            })
        
        return timeline

    def get_runtime_stats(self) -> Dict:
        """
        Get aggregate runtime statistics.
        
        Returns:
            Dict with runtime stats:
            - total_minutes: Total watch time in minutes
            - total_hours: Total watch time in hours (float)
            - total_days: Total watch time in days (float)
            - avg_runtime: Average runtime per film in minutes
            - longest_film: (name, runtime) of longest film
            - shortest_film: (name, runtime) of shortest film
            - films_with_runtime: Count of films with runtime data
        """
        if "runtime" not in self.df.columns:
            return {}
        
        # Use original df for total time (includes rewatches)
        runtime_df = self.df[["movie_name", "runtime"]].dropna(subset=["runtime"])
        
        if len(runtime_df) == 0:
            return {}
        
        total_minutes = int(runtime_df["runtime"].sum())
        films_with_runtime = len(runtime_df)
        avg_runtime = runtime_df["runtime"].mean()
        
        # For longest/shortest, use unique films
        unique_runtime = self.df_unique[["movie_name", "runtime"]].dropna(subset=["runtime"])
        
        longest_film = None
        shortest_film = None
        
        if len(unique_runtime) > 0:
            longest_idx = unique_runtime["runtime"].idxmax()
            shortest_idx = unique_runtime["runtime"].idxmin()
            
            longest_row = unique_runtime.loc[longest_idx]
            shortest_row = unique_runtime.loc[shortest_idx]
            
            longest_film = {
                "name": longest_row["movie_name"],
                "runtime": int(longest_row["runtime"])
            }
            shortest_film = {
                "name": shortest_row["movie_name"],
                "runtime": int(shortest_row["runtime"])
            }
        
        return {
            "total_minutes": total_minutes,
            "total_hours": round(total_minutes / 60, 1),
            "total_days": round(total_minutes / (60 * 24), 2),
            "avg_runtime": round(avg_runtime, 1) if avg_runtime else None,
            "longest_film": longest_film,
            "shortest_film": shortest_film,
            "films_with_runtime": films_with_runtime,
        }

    def get_decade_stats(self, min_films_for_favorite: int = 3) -> Dict:
        """
        Get statistics grouped by decade of film release.
        
        Args:
            min_films_for_favorite: Minimum films required for a decade to be "favorite"
            
        Returns:
            Dict with:
            - decades: list of {decade, count, avg_rating} sorted by decade
            - favorite_decade: {decade, count, avg_rating} - highest rated with min films
        """
        if "release_year" not in self.df_unique.columns:
            return {"decades": [], "favorite_decade": None}
        
        # Filter films with valid release years
        df = self.df_unique[self.df_unique["release_year"].notna()].copy()
        
        if len(df) == 0:
            return {"decades": [], "favorite_decade": None}
        
        # Calculate decade for each film
        df["decade"] = (df["release_year"] // 10 * 10).astype(int)
        
        # Group by decade
        decade_stats = []
        for decade, group in df.groupby("decade"):
            count = len(group)
            ratings = group["rating"].dropna()
            avg_rating = float(ratings.mean()) if len(ratings) > 0 else None
            
            decade_stats.append({
                "decade": f"{int(decade)}s",
                "decade_start": int(decade),
                "count": count,
                "avg_rating": round(avg_rating, 2) if avg_rating else None,
            })
        
        # Sort by decade (chronologically)
        decade_stats.sort(key=lambda x: x["decade_start"])
        
        # Find favorite decade (highest avg rating with min films)
        favorite_decade = None
        valid_decades = [d for d in decade_stats if d["count"] >= min_films_for_favorite and d["avg_rating"] is not None]
        
        if valid_decades:
            favorite_decade = max(valid_decades, key=lambda x: x["avg_rating"])
        
        return {
            "decades": decade_stats,
            "favorite_decade": favorite_decade,
        }

    def get_average_film_age(self) -> Optional[float]:
        """
        Calculate the average age of films when watched.
        
        Returns:
            Average age in years, or None if not calculable
        """
        if "release_year" not in self.df.columns or "watch_date" not in self.df.columns:
            return None
        
        # Use original df to include all watches
        df = self.df.copy()
        
        # Filter valid data
        df = df[df["release_year"].notna() & df["watch_date"].notna()]
        
        if len(df) == 0:
            return None
        
        # Extract watch year
        df["watch_year"] = pd.to_datetime(df["watch_date"], errors="coerce").dt.year
        df = df[df["watch_year"].notna()]
        
        if len(df) == 0:
            return None
        
        # Calculate age for each film
        df["film_age"] = df["watch_year"] - df["release_year"]
        
        avg_age = df["film_age"].mean()
        return round(avg_age, 1) if not pd.isna(avg_age) else None

    def get_average_rating(self) -> Optional[float]:
        """
        Calculate the user's overall average rating.
        
        Returns:
            Average rating, or None if no ratings
        """
        ratings = self.df_unique["rating"].dropna()
        
        if len(ratings) == 0:
            return None
        
        return round(float(ratings.mean()), 2)

    def get_milestones(self) -> List[Dict]:
        """
        Get milestone films (1st, 50th, 100th, 250th, 500th watched).
        
        Returns:
            List of milestone dicts with {milestone, film_name, watch_date, poster_url}
        """
        if "watch_date" not in self.df.columns:
            return []
        
        # Sort by watch_date to get chronological order
        df = self.df.copy()
        df["watch_date"] = pd.to_datetime(df["watch_date"], errors="coerce")
        df = df.dropna(subset=["watch_date"])
        df = df.sort_values("watch_date").reset_index(drop=True)
        
        if len(df) == 0:
            return []
        
        # Define milestone positions (1-indexed for display)
        milestone_positions = [1, 50, 100, 250, 500]
        milestones = []
        
        for pos in milestone_positions:
            # Convert to 0-indexed
            idx = pos - 1
            if idx < len(df):
                row = df.iloc[idx]
                milestone = {
                    "milestone": pos,
                    "milestone_label": f"{pos}{'st' if pos == 1 else 'th'}",
                    "film_name": row.get("movie_name", "Unknown"),
                    "watch_date": row["watch_date"].strftime("%B %d, %Y") if pd.notna(row["watch_date"]) else None,
                    "poster_url": row.get("poster_url") if pd.notna(row.get("poster_url")) else None,
                }
                milestones.append(milestone)
        
        return milestones
