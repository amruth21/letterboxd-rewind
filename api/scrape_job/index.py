"""
Python serverless function for Letterboxd scraping
Vercel Python serverless function handler
"""

import asyncio
import json
import sys
import time
from http.server import BaseHTTPRequestHandler
from pathlib import Path

# Add src directory to path
project_root = Path(__file__).parent.parent.parent
src_path = project_root / "src"
sys.path.insert(0, str(src_path))

from scraper import LetterboxdScraper
from storage import FilmDataStorage
from stats import StatCollector


def format_metric_stats(collector: StatCollector, metric_name: str, n: int = 10):
    """Format stats for a metric using all three scoring methods"""
    return {
        "weighted": [
            {"name": item, "score": float(score), "count": count, "avg_rating": float(avg)}
            for item, score, count, avg in collector.top_by_weighted_average(metric_name, n)
        ],
        "bayesian": [
            {"name": item, "score": float(score), "count": count, "avg_rating": float(avg)}
            for item, score, count, avg in collector.top_by_bayesian_average(metric_name, n)
        ],
        "wilson": [
            {"name": item, "score": float(score), "count": count, "avg_rating": float(avg)}
            for item, score, count, avg in collector.top_by_wilson_score(metric_name, n)
        ],
    }


async def run_scrape(username: str, year):
    """
    Main scraping logic with timing metrics
    
    Args:
        username: Letterboxd username
        year: Year to scrape (int) or "ALL" to scrape all years
        
    Returns:
        Dictionary with all stats and timing metrics
    """
    # Initialize timing metrics
    timing = {
        'total_time': 0.0,
        'scraping_pages_time': 0.0,
        'enrichment_time': 0.0,
        'dataframe_creation_time': 0.0,
        'stats_calculation_time': 0.0,
        'breakdown': {
            'pages_fetched': 0,
            'pages_fetch_time': 0.0,
            'pages_parse_time': 0.0,
            'films_scraped': 0,
            'films_enriched': 0,
            'enrich_fetch_time': 0.0,
            'enrich_parse_time': 0.0,
        }
    }
    
    total_start = time.time()
    
    all_films = []
    years_scraped = []
    scrapers = []  # Keep track of all scrapers to collect their stats
    
    if year == "ALL" or str(year).upper() == "ALL":
        # Scrape all years, starting from current year going backwards
        from datetime import datetime
        current_year = datetime.now().year
        year_to_scrape = current_year
        
        scraping_start = time.time()
        
        # Keep going backwards until we hit a year with no films
        while year_to_scrape >= 2000:  # Reasonable lower bound
            scraper = LetterboxdScraper(
                username=username,
                year=year_to_scrape,
                request_delay=0.5,
            )
            scrapers.append(scraper)
            
            films = await scraper.scrape_all_pages(max_pages=None, max_films=None)
            
            if not films:
                break
            
            all_films.extend(films)
            years_scraped.append(year_to_scrape)
            
            year_to_scrape -= 1
        
        timing['scraping_pages_time'] = time.time() - scraping_start
        
        if not all_films:
            timing['total_time'] = time.time() - total_start
            return {
                'success': False,
                'error': 'No films found for any year.',
                'username': username,
                'year': 'ALL',
                'timing': timing
            }
        
        # Enrich all films with controlled concurrency (25 films at a time)
        enrich_start = time.time()
        scraper = LetterboxdScraper(username=username, year=years_scraped[0] if years_scraped else current_year, request_delay=0.1)
        scrapers.append(scraper)
        try:
            await scraper.enrich_films(all_films, max_concurrency=25)
        except Exception as e:
            pass  # Continue with unenriched data
        timing['enrichment_time'] = time.time() - enrich_start
        
        films = all_films
        year = f"ALL ({min(years_scraped)}-{max(years_scraped)})" if years_scraped else "ALL"
    else:
        # Single year scraping
        scraping_start = time.time()
        
        scraper = LetterboxdScraper(
            username=username,
            year=int(year),
            request_delay=0.5,
        )
        scrapers.append(scraper)
        
        # Scrape all pages
        films = await scraper.scrape_all_pages(max_pages=None, max_films=None)
        timing['scraping_pages_time'] = time.time() - scraping_start
        
        if not films:
            timing['total_time'] = time.time() - total_start
            return {
                'success': False,
                'error': 'No films found. Please check your username and year.',
                'username': username,
                'year': year,
                'timing': timing
            }
        
        # Enrich films with cast and avg rating (controlled concurrency)
        enrich_start = time.time()
        try:
            await scraper.enrich_films(films, max_concurrency=25)
        except Exception as e:
            pass  # Continue with unenriched data
        timing['enrichment_time'] = time.time() - enrich_start
    
    # Aggregate scraper stats from all scrapers
    for s in scrapers:
        timing['breakdown']['pages_fetched'] += s.stats.get('pages_fetched', 0)
        timing['breakdown']['pages_fetch_time'] += s.stats.get('pages_fetch_time_total', 0)
        timing['breakdown']['pages_parse_time'] += s.stats.get('pages_parse_time_total', 0)
        timing['breakdown']['films_scraped'] += s.stats.get('films_parsed', 0)
        timing['breakdown']['enrich_fetch_time'] += s.stats.get('enrich_fetch_time_total', 0)
        timing['breakdown']['enrich_parse_time'] += s.stats.get('enrich_parse_time_total', 0)
    
    timing['breakdown']['films_enriched'] = len(films)
    
    # Convert to DataFrame
    df_start = time.time()
    storage = FilmDataStorage()
    df = storage.create_dataframe(films)
    timing['dataframe_creation_time'] = time.time() - df_start
    
    # Collect stats
    stats_start = time.time()
    stats_collector = StatCollector(df)
    
    # Aggregate metrics
    stats_collector.aggregate_list_field("genres", "Genres")
    stats_collector.aggregate_list_field("actors", "Actors")
    stats_collector.aggregate_list_field("directors", "Directors")
    stats_collector.aggregate_list_field("cinematography", "Cinematographers")
    stats_collector.aggregate_single_field("studio", "Studios")
    stats_collector.aggregate_single_field("language", "Languages")
    stats_collector.aggregate_single_field("day_of_week", "Day of Week")
    
    # Build comprehensive stats dictionary
    day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    
    # Day of week stats
    day_stats = {}
    if "day_of_week" in df.columns:
        day_counts = df["day_of_week"].value_counts().to_dict()
        day_ratings = {}
        for day in day_order:
            day_df = df[df["day_of_week"] == day]
            if len(day_df) > 0:
                ratings = day_df["rating"].dropna()
                day_ratings[day] = float(ratings.mean()) if len(ratings) > 0 else None
            else:
                day_ratings[day] = None
        
        for day in day_order:
            day_stats[day] = {
                'count': int(day_counts.get(day, 0)),
                'avg_rating': day_ratings[day] if day_ratings[day] is not None else None
            }
    
    # Build actor mapping
    actor_map = {}
    unique_df = stats_collector.df_unique
    for _, row in unique_df.iterrows():
        title = row.get("movie_name") or ""
        items = row.get("actors") or []
        if isinstance(items, str):
            items = [x.strip() for x in items.split(";")]
        for actor in items:
            if not actor:
                continue
            entry = actor_map.setdefault(actor, {"count": 0, "films": []})
            entry["count"] += 1
            entry["films"].append(title)
    
    # Convert actor map to list sorted by count
    actor_list = [
        {"actor": actor, "count": info["count"], "films": info["films"]}
        for actor, info in sorted(actor_map.items(), key=lambda x: x[1]["count"], reverse=True)
    ]
    
    timing['stats_calculation_time'] = time.time() - stats_start
    
    # Convert DataFrame to list of dicts for CSV export
    # Convert Timestamp objects to strings and handle NaN values for JSON serialization
    import numpy as np
    df_export = df.copy()
    for col in df_export.columns:
        if df_export[col].dtype == 'datetime64[ns]':
            df_export[col] = df_export[col].astype(str).replace('NaT', '')
    # Replace NaN with None (becomes null in JSON)
    df_export = df_export.replace({np.nan: None})
    raw_data = df_export.to_dict('records')
    
    # Calculate total time
    timing['total_time'] = time.time() - total_start
    
    # Round all timing values for cleaner output
    for key in timing:
        if isinstance(timing[key], float):
            timing[key] = round(timing[key], 2)
    for key in timing['breakdown']:
        if isinstance(timing['breakdown'][key], float):
            timing['breakdown'][key] = round(timing['breakdown'][key], 2)
    
    # Calculate aggregate counts from stats
    aggregate_counts = {
        'total_actors': len(stats_collector.stats.get("Actors", {})),
        'total_directors': len(stats_collector.stats.get("Directors", {})),
        'total_genres': len(stats_collector.stats.get("Genres", {})),
        'total_languages': len(stats_collector.stats.get("Languages", {})),
        'total_studios': len(stats_collector.stats.get("Studios", {})),
        'total_cinematographers': len(stats_collector.stats.get("Cinematographers", {})),
    }
    
    # Build response
    result = {
        'success': True,
        'username': username,
        'year': year,
        'total_films': len(films),
        'unique_films': len(stats_collector.df_unique),
        'aggregate_counts': aggregate_counts,
        'raw_data': raw_data,  # Include raw data for CSV export
        
        # Timing metrics
        'timing': timing,
        
        # Aggregated metrics with all scoring methods
        'genres': format_metric_stats(stats_collector, "Genres", 10),
        'actors': format_metric_stats(stats_collector, "Actors", 10),
        'directors': format_metric_stats(stats_collector, "Directors", 10),
        'cinematographers': format_metric_stats(stats_collector, "Cinematographers", 10),
        'studios': format_metric_stats(stats_collector, "Studios", 10),
        'languages': format_metric_stats(stats_collector, "Languages", 10),
        
        # Day of week stats
        'day_of_week': day_stats,
        
        # Top rewatched movies (max 3, only movies watched more than once)
        'top_rewatched': [
            {"movie": movie, "count": count}
            for movie, count in stats_collector.top_rewatched(3)
        ],
        
        # Most watched (by count)
        'most_watched': {
            'directors': [
                {"name": name, "count": count, "avg_rating": float(avg) if avg is not None else None}
                for name, count, avg in stats_collector.top_by_count("Directors", 10)
            ],
            'actors': [
                {"name": name, "count": count, "avg_rating": float(avg) if avg is not None else None}
                for name, count, avg in stats_collector.top_by_count("Actors", 10)
            ],
            'genres': [
                {"name": name, "count": count, "avg_rating": float(avg) if avg is not None else None}
                for name, count, avg in stats_collector.top_by_count("Genres", 10)
            ],
            'cinematographers': [
                {"name": name, "count": count, "avg_rating": float(avg) if avg is not None else None}
                for name, count, avg in stats_collector.top_by_count("Cinematographers", 10)
            ],
            'studios': [
                {"name": name, "count": count, "avg_rating": float(avg) if avg is not None else None}
                for name, count, avg in stats_collector.top_by_count("Studios", 10)
            ],
            'languages': [
                {"name": name, "count": count, "avg_rating": float(avg) if avg is not None else None}
                for name, count, avg in stats_collector.top_by_count("Languages", 10)
            ],
        },
        
        # Polarizing takes
        'polarizing_takes': {
            'top_variance_movies': [
                {
                    "movie": movie,
                    "your_rating": float(your_rating),
                    "avg_rating": float(avg_rating),
                    "variance": float(variance),
                    "direction": "overrated" if variance > 0 else "underrated"
                }
                for movie, your_rating, avg_rating, variance in stats_collector.top_rating_variance_movies(10)
            ],
            'top_overhyped_directors': [
                {
                    "director": director,
                    "avg_variance": float(avg_var),
                    "num_films": num_films,
                    "weighted_score": float(weighted)
                }
                for director, avg_var, num_films, weighted in stats_collector.top_overhyped_directors(10, min_films=1)
            ],
            'top_underhyped_directors': [
                {
                    "director": director,
                    "avg_variance": float(avg_var),
                    "num_films": num_films,
                    "weighted_score": float(weighted)
                }
                for director, avg_var, num_films, weighted in stats_collector.top_underhyped_directors(10, min_films=2)
            ],
        },
        
        # Actor mapping (all actors with their films)
        'actors_detailed': actor_list[:50],  # Top 50 actors
        
        # Cumulative watch timeline (aggregated by date)
        'watch_timeline': stats_collector.get_cumulative_timeline_aggregated(),
        
        # Runtime statistics
        'runtime_stats': stats_collector.get_runtime_stats(),
        
        # Decade statistics
        'decade_stats': stats_collector.get_decade_stats(),
        
        # Average film age (how old are the films you watch)
        'average_film_age': stats_collector.get_average_film_age(),
        
        # Average rating
        'average_rating': stats_collector.get_average_rating(),
    }
    
    return result


class handler(BaseHTTPRequestHandler):
    """
    Vercel Python serverless function handler
    This class handles HTTP requests from Vercel
    """
    
    def do_POST(self):
        """Handle POST requests"""
        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            
            # Parse JSON body
            try:
                body_data = json.loads(body)
            except json.JSONDecodeError:
                self.send_error_response(400, {'success': False, 'error': 'Invalid JSON in request body'})
                return
            
            username = body_data.get('username', '')
            year = body_data.get('year', 2025)
            
            # Validate inputs
            if not username:
                self.send_error_response(400, {'success': False, 'error': 'Username is required'})
                return
            
            # Accept "ALL" or numeric year
            if isinstance(year, str) and year.upper() == "ALL":
                year = "ALL"
            elif not isinstance(year, (int, str)) or (isinstance(year, str) and year.upper() != "ALL"):
                try:
                    year = int(year)
                except (ValueError, TypeError):
                    self.send_error_response(400, {'success': False, 'error': 'Year must be a number or "ALL"'})
                    return
            
            if year != "ALL":
                try:
                    year = int(year)
                except (ValueError, TypeError):
                    self.send_error_response(400, {'success': False, 'error': 'Year must be a valid number'})
                    return
            
            # Run async scraping function
            result = asyncio.run(run_scrape(username, year))
            
            # Send success response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode('utf-8'))
            
        except Exception as e:
            import traceback
            error_response = {
                'success': False,
                'error': str(e),
                'traceback': traceback.format_exc()
            }
            self.send_error_response(500, error_response)
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def send_error_response(self, status_code, error_data):
        """Helper method to send error responses"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(error_data).encode('utf-8'))
    
    def log_message(self, format, *args):
        """Suppress default logging"""
        pass  # Vercel handles logging
