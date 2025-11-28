# Letterboxd Rewind

A Python scraper for Letterboxd film diary pages. Extracts movie name, release year, watch date, and rating from your Letterboxd diary and stores them in a pandas DataFrame or exports to CSV/JSON.

## Features

- **JavaScript-aware scraping** using Playwright for dynamic content
- **Pagination support** for multi-page diary entries
- **Data extraction** of movies, release years, watch dates, and ratings
- **Multiple export formats** (CSV, JSON)
- **Configurable** delays and browser settings
- **Respectful scraping** with delays between requests

## Project Structure

```
letterboxd-rewind/
├── src/
│   ├── __init__.py
│   ├── scraper.py        # Main scraper logic (Playwright)
│   ├── stats.py          # Statistics collection and analysis
│   └── storage.py        # Data storage and export (pandas)
├── config/
│   └── config.example.py # Example configuration (optional)
├── output/               # Output directory for CSV/JSON files
├── tests/                # Test files (future)
├── main.py               # Entry point script
├── requirements.txt      # Python dependencies
└── README.md             # This file
```

## Installation

1. Clone or navigate to the repository:
   ```bash
   cd letterboxd-rewind
   ```

2. Create a virtual environment (recommended):
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Install Playwright browsers:
   ```bash
   playwright install
   ```

## Configuration

Edit `main.py` to customize:

- `USERNAME` - Your Letterboxd username
- `YEAR` - Year to scrape
- `MAX_PAGES` - Maximum pages to scrape (None for all)
- `REQUEST_DELAY` - Delay between requests in seconds (be respectful!)
- `HEADLESS` - Set to False to see browser in action
- `OUTPUT_FORMAT` - 'csv', 'json', or 'both'

Or use `config/config.example.py` as a template for more advanced configuration.

## Usage

Run the scraper:
```bash
python main.py
```

The scraper will:
1. Connect to Letterboxd and scrape all pages of your diary for the specified year
2. Extract film data from each page (movie name, date, rating, etc.)
3. Enrich films with additional data (cast, crew, genres, ratings) from individual film pages
4. Generate comprehensive statistics including:
   - Most watched directors, actors, and genres
   - Watching patterns by day of week
   - Rating variance analysis (your ratings vs. average ratings)
   - Top rewatched movies
5. Display results in the console
6. Save to CSV files in the `output/` directory (main data + actor statistics)

## Extracted Data

The scraper collects:
- **movie_name**: Title of the film
- **release_year**: Year the film was released
- **watch_date**: Date you watched the film
- **day_of_week**: Day of the week you watched the film
- **rating**: Rating you gave the film
- **actors**: List of actors in the film
- **avg_rating**: Average Letterboxd rating for the film
- **directors**: List of directors
- **writers**: List of writers
- **editors**: List of editors
- **cinematography**: List of cinematographers
- **language**: Primary language of the film
- **studio**: Production studio
- **genres**: List of genres

Results are stored in a pandas DataFrame and can be exported as CSV or JSON.

## Data Structure Example

```
        movie_name  release_year   watch_date  rating
0  The Godfather         1972.0   2025-01-15     5.0
1  Inception            2010.0   2025-01-14     4.5
2  The Matrix          1999.0   2025-01-13     4.0
```

## Requirements

- Python 3.8+
- Playwright (for browser automation)
- BeautifulSoup4 (for HTML parsing)
- pandas (for data storage)
- lxml (fast HTML/XML parsing)

## Important Notes

⚠️ **Scraping Etiquette**
- Always respect the website's terms of service
- Use appropriate delays between requests (default: 2 seconds)
- Don't scrape more frequently than necessary
- Consider using official APIs if available

⚠️ **Anti-bot Measures**
- Letterboxd may rate limit or block aggressive scraping
- The scraper includes a User-Agent header to appear as a regular browser
- Adjust `REQUEST_DELAY` if you encounter rate limiting

## Troubleshooting

### "No films found on page 1"
- Check that your username is correct
- Verify the year has films in your diary
- The page might be loading slowly; try increasing `BROWSER_TIMEOUT`

### Playwright installation fails
```bash
playwright install chromium
```

### Rate limiting / 429 errors
- Increase `REQUEST_DELAY` (try 5+ seconds)
- Run during off-peak hours
- Reduce `MAX_PAGES` to test with fewer pages first

## Future Enhancements

- [ ] Configuration file support (.env)
- [ ] Retry logic with exponential backoff
- [ ] Review text extraction
- [ ] Watch history statistics and analysis
- [ ] Database storage (SQLite, PostgreSQL)
- [ ] AWS Lambda deployment package
- [ ] Scheduled execution with APScheduler
- [ ] API endpoint for web access

## License

MIT License - feel free to use and modify for personal projects.
