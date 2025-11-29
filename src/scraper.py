"""
Letterboxd diary page scraper using requests and aiohttp
Handles pagination and data extraction with optimized concurrent enrichment
"""

import asyncio
import time
import re
import json
from typing import List, Optional
from bs4 import BeautifulSoup
import requests

# aiohttp for fast async HTTP
try:
    import aiohttp
    AIOHTTP_AVAILABLE = True
except ImportError:
    AIOHTTP_AVAILABLE = False


class LetterboxdScraper:
    """Scrapes Letterboxd diary pages for film entries"""

    def __init__(
        self,
        username: str,
        year: int,
        request_delay: float = 0.5,
    ):
        """
        Initialize the scraper

        Args:
            username: Letterboxd username
            year: Year to scrape films for
            request_delay: Delay between requests in seconds
        """
        self.username = username
        self.year = year
        self.request_delay = request_delay
        self.base_url = f"https://letterboxd.com/{username}/diary/films/for/{year}"
        # Runtime stats to help profile where time is spent
        self.stats = {
            "scrape_all_pages_time": 0.0,
            "pages_fetched": 0,
            "pages_fetch_time_total": 0.0,
            "pages_parse_time_total": 0.0,
            "films_parsed": 0,
            "enrich_total_time": 0.0,
            "enrich_fetch_time_total": 0.0,
            "enrich_parse_time_total": 0.0,
            "enrich_success_count": 0,
            "enrich_fail_count": 0,
        }

    async def scrape_all_pages(
        self, max_pages: Optional[int] = None, max_films: Optional[int] = None
    ) -> List[dict]:
        """
        Scrape all pages of the diary for the given year

        Args:
            max_pages: Maximum number of pages to scrape (None for all)
            max_films: Maximum number of films to scrape (None for all)

        Returns:
            List of film dictionaries with data
        """
        all_films = []

        scrape_start = time.time()

        # Use requests for diary pages (faster) and run blocking calls in a thread
        headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
        current_page = 1

        try:
            while True:
                # Build page URL
                if current_page == 1:
                    url = self.base_url
                else:
                    url = f"{self.base_url}/page/{current_page}/"

                print(f"Scraping page {current_page}: {url}")

                fetch_start = time.time()
                try:
                    resp = await asyncio.to_thread(requests.get, url, headers=headers, timeout=30)
                    resp.raise_for_status()
                    html = resp.text
                    fetch_elapsed = time.time() - fetch_start
                except Exception as e:
                    print(f"Error fetching page {url} with requests: {e}")
                    break

                # Parse page HTML
                parse_start = time.time()
                films = self._parse_films_from_html(html)
                parse_elapsed = time.time() - parse_start

                # update page-level stats
                self.stats["pages_fetched"] += 1
                self.stats["pages_fetch_time_total"] += fetch_elapsed
                self.stats["pages_parse_time_total"] += parse_elapsed

                if not films:
                    print(f"No films found on page {current_page}. Stopping.")
                    break

                all_films.extend(films)
                # If a max_films limit is provided, stop when reached
                if max_films and len(all_films) >= max_films:
                    # Trim to exactly max_films
                    all_films = all_films[:max_films]
                    print(f"Reached max films limit ({max_films})")
                    break

                print(f"Found {len(films)} films on page {current_page}. Total: {len(all_films)}")

                # Check if we've reached max_pages
                if max_pages and current_page >= max_pages:
                    print(f"Reached max pages limit ({max_pages})")
                    break

                current_page += 1
                await asyncio.sleep(self.request_delay)

        except Exception as e:
            print(f"Unexpected error during scraping: {e}")

        self.stats["scrape_all_pages_time"] = time.time() - scrape_start
        return all_films


    def _parse_films_from_html(self, html: str) -> List[dict]:
        """
        Parse film entries from HTML content

        Args:
            html: HTML content of the page

        Returns:
            List of parsed film dictionaries
        """
        soup = BeautifulSoup(html, "lxml")
        films = []

        # Find all elements with data-film-id (these are the film entries)
        film_entries = soup.find_all(attrs={"data-film-id": True})

        if not film_entries:
            print("  Warning: No film entries found")
            return []

        print(f"  Found {len(film_entries)} films")

        for entry in film_entries:
            try:
                film_data = self._extract_film_data(entry)
                if film_data:
                    films.append(film_data)
            except Exception as e:
                print(f"  Error parsing film entry: {e}")
                continue

        # update films parsed count
        self.stats["films_parsed"] += len(films)
        return films

    def _extract_film_data(self, entry) -> Optional[dict]:
        """
        Extract film data from a diary entry row

        Args:
            entry: BeautifulSoup element for a film entry (div with data-film-id)

        Returns:
            Dictionary with film data or None if extraction fails
        """
        try:
            # The film entry is a div with data attributes
            movie_name = entry.get("data-item-name")
            if not movie_name:
                return None

            # Extract name without year (year is in parentheses)
            if "(" in movie_name and ")" in movie_name:
                clean_name = movie_name.split(" (")[0].strip()
                year_str = movie_name.split("(")[-1].split(")")[0]
                try:
                    release_year = int(year_str)
                except ValueError:
                    release_year = None
            else:
                clean_name = movie_name
                release_year = None

            # Get the row to find date and rating
            row = entry.find_parent("tr")
            watch_date = None
            rating = None

            if row:
                cells = row.find_all("td")

                # Extract date from daydate link in Cell 1
                # The daydate link href contains the date: /amruth21/diary/films/for/2025/11/16/
                if len(cells) > 1:
                    daydate_link = cells[1].find("a", class_="daydate")
                    if daydate_link and daydate_link.get("href"):
                        href = daydate_link.get("href")
                        # Extract year, month, day from URL
                        match = re.search(r'/(\d{4})/(\d{2})/(\d{2})/', href)
                        if match:
                            year = match.group(1)
                            month = match.group(2)
                            day = match.group(3)
                            watch_date = f"{year}-{month}-{day}"

                # Cell 4 (col-rating) contains the rating
                    if len(cells) > 4:
                        rating_elem = cells[4].find(class_="rating")
                        if rating_elem:
                            # Pass the element so parser can inspect classes (e.g. rated-7)
                            rating = self._parse_rating(rating_elem)

            # Try to capture the film path for later enrichment
            film_path = entry.get("data-item-link") or entry.get("data-target-link") or entry.get("data-item-slug")

            # Initialize enrichment keys so dataframe always has these columns
            return {
                "movie_name": clean_name,
                "release_year": release_year,
                "watch_date": watch_date,
                "rating": rating,
                "film_path": film_path,
                # enrichment defaults
                "actors": [],
                "avg_rating": None,
                "runtime": None,  # Runtime in minutes
                "poster_url": None,  # Movie poster image URL
                "directors": [],
                "writers": [],
                "editors": [],
                "cinematography": [],
                "language": None,
                "studio": None,
                "genres": [],
            }

        except Exception as e:
            print(f"  Error extracting film data: {e}")
            return None

    def _parse_rating(self, rating_input) -> Optional[float]:
        """
        Parse rating from a BeautifulSoup Tag or text.

        Handles:
        - Letterboxd's class-based ratings (e.g. rated-7)
        - Star symbols (★, ½)
        - Numeric strings
        """
        if rating_input is None:
            return None

        # Attempt to detect a Letterboxd class-based rating (e.g. rated-7)
        try:
            classes = rating_input.get("class", []) if hasattr(rating_input, 'get') else []
            for cls in classes:
                m = re.match(r"rated-(\d+)", cls)
                if m:
                    return int(m.group(1)) / 2.0  # Convert Letterboxd scale (1-10) to 0.5-5.0 scale
        except Exception:
            pass

        # Fallback: treat as text
        if hasattr(rating_input, "get_text"):
            rating_text = rating_input.get_text(strip=True)
        else:
            rating_text = str(rating_input or "")

        # Try to find an explicit numeric value first
        numbers = re.findall(r"(\d+\.\d+|\d+)", rating_text)
        if numbers:
            try:
                return float(numbers[0])
            except Exception:
                pass

        # Count full stars and detect half-star symbol
        star_count = rating_text.count("★")
        half_star = 0.5 if "½" in rating_text or "\u00bd" in rating_text else 0.0
        if star_count > 0 or half_star:
            return float(star_count) + half_star

        return None

    async def enrich_films(self, films: List[dict], max_concurrency: int = 25):
        """
        Enrich each film dictionary with additional details using async HTTP.
        
        Uses controlled concurrency to avoid rate limiting while still being fast.
        
        Args:
            films: List of film dictionaries to enrich
            max_concurrency: Maximum number of concurrent film enrichments (default 25)
        """
        if not films:
            return
            
        enrich_start = time.time()
        
        if AIOHTTP_AVAILABLE:
            await self._enrich_films_aiohttp(films, max_concurrency)
        else:
            # Fallback to slower requests-based approach
            await self._enrich_films_requests(films, max_concurrency)
        
        self.stats["enrich_total_time"] = time.time() - enrich_start
        print(f"Enrichment complete: {self.stats['enrich_success_count']} success, {self.stats['enrich_fail_count']} failed")

    async def _enrich_films_aiohttp(self, films: List[dict], max_concurrency: int):
        """Enrichment using aiohttp with controlled concurrency and retries"""
        
        # Use a semaphore to control concurrency at the film level
        semaphore = asyncio.Semaphore(max_concurrency)
        
        # Create a connector with reasonable limits
        connector = aiohttp.TCPConnector(
            limit=max_concurrency * 4,  # 4 requests per film
            limit_per_host=max_concurrency * 4,
            ttl_dns_cache=300,
            enable_cleanup_closed=True,
        )
        
        timeout = aiohttp.ClientTimeout(total=30, connect=10)
        headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
        
        async with aiohttp.ClientSession(connector=connector, timeout=timeout, headers=headers) as session:
            tasks = []
            for film in films:
                task = self._enrich_single_film_aiohttp(session, semaphore, film)
                tasks.append(task)
            
            # Run all tasks with controlled concurrency via semaphore
            await asyncio.gather(*tasks, return_exceptions=True)

    async def _enrich_single_film_aiohttp(self, session: 'aiohttp.ClientSession', semaphore: asyncio.Semaphore, film: dict):
        """Enrich a single film with semaphore-controlled concurrency and retries"""
        async with semaphore:
            film_path = film.get("film_path")
            if not film_path:
                return
            
            # Normalize film_path
            if not film_path.startswith("/"):
                film_path = "/" + film_path
            if not film_path.startswith("/film/") and "/film/" not in film_path:
                film_path = f"/film/{film_path}"
            
            base_url = f"https://letterboxd.com{film_path}"
            
            urls = {
                'main': base_url.rstrip('/'),
                'crew': base_url.rstrip('/') + '/crew/',
                'details': base_url.rstrip('/') + '/details/',
                'genres': base_url.rstrip('/') + '/genres/',
            }
            
            fetch_start = time.time()
            
            async def fetch_with_retry(url: str, max_retries: int = 3) -> Optional[str]:
                """Fetch a URL with retries on failure"""
                for attempt in range(max_retries):
                    try:
                        async with session.get(url) as resp:
                            if resp.status == 200:
                                return await resp.text()
                            elif resp.status == 429:  # Rate limited
                                wait_time = (attempt + 1) * 2  # Exponential backoff
                                await asyncio.sleep(wait_time)
                            elif resp.status >= 500:  # Server error
                                await asyncio.sleep(1)
                            else:
                                return None  # Client error, don't retry
                    except asyncio.TimeoutError:
                        await asyncio.sleep(1)
                    except Exception:
                        await asyncio.sleep(0.5)
                return None
            
            # Fetch all 4 pages concurrently (within this film's semaphore slot)
            results = await asyncio.gather(
                fetch_with_retry(urls['main']),
                fetch_with_retry(urls['crew']),
                fetch_with_retry(urls['details']),
                fetch_with_retry(urls['genres']),
            )
            
            fetch_elapsed = time.time() - fetch_start
            self.stats["enrich_fetch_time_total"] += fetch_elapsed
            
            main_html, crew_html, details_html, genres_html = results
            
            # Track success/failure
            if main_html or crew_html:
                self.stats["enrich_success_count"] += 1
            else:
                self.stats["enrich_fail_count"] += 1
            
            # Parse all pages
            parse_start = time.time()
            self._parse_main_page(film, main_html)
            self._parse_crew_page(film, crew_html)
            self._parse_details_page(film, details_html)
            self._parse_genres_page(film, genres_html)
            parse_elapsed = time.time() - parse_start
            self.stats["enrich_parse_time_total"] += parse_elapsed

    def _parse_main_page(self, film: dict, html: Optional[str]):
        """Parse main film page for actors, average rating, and runtime"""
        if not html:
            return
            
        try:
            soup = BeautifulSoup(html, "lxml")
            
            # Extract cast
            actors = []
            cast_container = soup.select_one("#tab-cast .cast-list, .cast-list.text-sluglist, .cast-list")
            if cast_container:
                for a in cast_container.find_all("a", class_="text-slug"):
                    name = a.get_text(strip=True)
                    if name:
                        actors.append(name)
            else:
                for a in soup.find_all("a", href=True):
                    href = a.get("href", "")
                    if href.startswith("/actor/") or "/actor/" in href:
                        name = a.get_text(strip=True)
                        if name:
                            actors.append(name)
            
            # Deduplicate and limit to 15
            seen = set()
            deduped = []
            for name in actors:
                if name not in seen:
                    seen.add(name)
                    deduped.append(name)
            film["actors"] = deduped[:15]
            
            # Extract average rating
            avg_rating = None
            meta = soup.find("meta", attrs={"name": "twitter:data2"})
            if meta and meta.get("content"):
                m = re.search(r"(\d+\.?\d*)", meta.get("content", ""))
                if m:
                    try:
                        avg_rating = float(m.group(1))
                    except Exception:
                        pass
            
            # Extract runtime and avg_rating from ld+json
            runtime = None
            for script in soup.find_all("script", type="application/ld+json"):
                try:
                    j = json.loads(script.string)
                    if isinstance(j, dict):
                        # Get average rating if not already found
                        if avg_rating is None and "aggregateRating" in j:
                            ar = j["aggregateRating"]
                            if isinstance(ar, dict) and ar.get("ratingValue"):
                                avg_rating = float(ar.get("ratingValue"))
                        
                        # Get runtime (duration in ISO 8601 format like "PT120M" or "PT2H30M")
                        if runtime is None and "duration" in j:
                            duration_str = j.get("duration", "")
                            if duration_str:
                                runtime = self._parse_iso_duration(duration_str)
                except Exception:
                    continue
            
            # Fallback: look for runtime text in page (e.g., "120 mins")
            if runtime is None:
                # Look for text pattern like "120 mins" or "2h 30m"
                text = soup.get_text()
                # Match patterns like "120 mins", "90 min", "2h 30m", "2 hrs 30 mins"
                runtime_match = re.search(r'(\d+)\s*(?:mins?|minutes?)\s*(?:More at|$)', text)
                if runtime_match:
                    try:
                        runtime = int(runtime_match.group(1))
                    except Exception:
                        pass
            
            film["avg_rating"] = avg_rating
            film["runtime"] = runtime
            
            # Extract poster URL - Letterboxd stores actual poster in script tags
            poster_url = None
            
            # Method 1: Look in script tags for poster URL patterns
            # Letterboxd uses two URL patterns:
            #   - film-poster/x/x/x/... (newer format)
            #   - sm/upload/xx/xx/... (older format)
            for script in soup.find_all("script"):
                text = script.string or ""
                
                # Pattern 1: film-poster URLs
                matches = re.findall(r'https://a\.ltrbxd\.com/resized/film-poster/[^"\'<>\s]+\.jpg', text)
                if matches:
                    for url in matches:
                        if '-230-' in url or '-500-' in url or '-1000-' in url:
                            poster_url = url
                            break
                    if not poster_url:
                        poster_url = matches[0]
                    break
                
                # Pattern 2: sm/upload URLs (for older films)
                if not poster_url:
                    matches = re.findall(r'https://a\.ltrbxd\.com/resized/sm/upload/[^"\'<>\s]+-0-230-0-345-crop\.jpg[^"\'<>\s]*', text)
                    if matches:
                        poster_url = matches[0]
                        break
            
            # Method 2: Check data attributes on poster divs
            if not poster_url:
                for div in soup.find_all("div", class_="film-poster"):
                    for attr, val in div.attrs.items():
                        if attr.startswith("data-") and isinstance(val, str) and "ltrbxd.com" in val:
                            if "film-poster" in val or ("sm/upload" in val and "-crop" in val):
                                poster_url = val
                                break
                    if poster_url:
                        break
            
            # If we got a poster URL, upgrade to higher resolution (500x750 instead of 230x345)
            if poster_url:
                poster_url = re.sub(r'-0-230-0-345-', '-0-500-0-750-', poster_url)
                poster_url = re.sub(r'-0-110-0-165-', '-0-500-0-750-', poster_url)
            
            film["poster_url"] = poster_url
        except Exception:
            pass

    def _parse_iso_duration(self, duration: str) -> Optional[int]:
        """
        Parse ISO 8601 duration format (e.g., PT120M, PT2H30M) to minutes.
        
        Args:
            duration: ISO 8601 duration string
            
        Returns:
            Duration in minutes, or None if parsing fails
        """
        if not duration:
            return None
            
        try:
            total_minutes = 0
            
            # Remove PT prefix
            duration = duration.upper().replace("PT", "")
            
            # Extract hours
            hours_match = re.search(r'(\d+)H', duration)
            if hours_match:
                total_minutes += int(hours_match.group(1)) * 60
            
            # Extract minutes
            mins_match = re.search(r'(\d+)M', duration)
            if mins_match:
                total_minutes += int(mins_match.group(1))
            
            # If only seconds (rare for movies)
            if total_minutes == 0:
                secs_match = re.search(r'(\d+)S', duration)
                if secs_match:
                    total_minutes = int(secs_match.group(1)) // 60
            
            return total_minutes if total_minutes > 0 else None
        except Exception:
            return None

    def _parse_crew_page(self, film: dict, html: Optional[str]):
        """Parse crew page for directors, writers, etc."""
        if not html:
            return
            
        try:
            soup = BeautifulSoup(html, 'lxml')
            
            directors = []
            writers = []
            editors = []
            cinematography = []
            
            container = soup.select_one('#tab-crew') or soup
            for header in container.find_all(['h2', 'h3', 'h4']):
                role = header.get_text(strip=True)
                role_lower = role.lower()
                sibling = header.find_next_sibling()
                if not sibling:
                    continue
                names = [a.get_text(strip=True) for a in sibling.find_all('a', class_='text-slug')]
                if not names:
                    names = [a.get_text(strip=True) for a in sibling.find_all('a')]
                
                if re.search(r"\bdirector(s)?\b", role_lower) and not re.search(r"assistant|asst|art|set|decor|production design", role_lower):
                    directors.extend([n for n in names if n])
                elif re.search(r"writer|screenplay|written", role_lower):
                    writers.extend([n for n in names if n])
                elif re.search(r"edit|edited", role_lower):
                    editors.extend([n for n in names if n])
                elif re.search(r"cinemat|camera|director of photography|d\.o\.p|\bdp\b", role_lower):
                    cinematography.extend([n for n in names if n])
            
            # Fallback for directors
            if not directors:
                for a in soup.find_all('a', href=True):
                    if '/director/' in a['href']:
                        directors.append(a.get_text(strip=True))
            
            def dedupe(lst):
                seen = set()
                return [x for x in lst if x and x not in seen and not seen.add(x)]
            
            film['directors'] = dedupe(directors)
            film['writers'] = dedupe(writers)
            film['editors'] = dedupe(editors)
            film['cinematography'] = dedupe(cinematography)
        except Exception:
            pass

    def _parse_details_page(self, film: dict, html: Optional[str]):
        """Parse details page for language and studio"""
        if not html:
            return
            
        try:
            soup = BeautifulSoup(html, 'lxml')
            
            # Language from ld+json
            language = None
            for script in soup.find_all('script', type='application/ld+json'):
                try:
                    j = json.loads(script.string)
                    if isinstance(j, dict):
                        if j.get('inLanguage'):
                            language = j.get('inLanguage')
                            break
                        if j.get('language'):
                            language = j.get('language')
                            break
                    elif isinstance(j, list):
                        for item in j:
                            if isinstance(item, dict) and item.get('inLanguage'):
                                language = item.get('inLanguage')
                                break
                        if language:
                            break
                except Exception:
                    continue
            
            # Fallback for language
            if not language:
                label = soup.find(lambda t: t.name in ['dt','h2','h3','h4','strong','span','p'] and 'language' in t.get_text(strip=True).lower())
                if label:
                    cur = label
                    while True:
                        cur = cur.find_next()
                        if cur is None:
                            break
                        try:
                            txt = cur.get_text(strip=True)
                        except Exception:
                            txt = str(cur).strip()
                        if not txt:
                            continue
                        if 'language' in txt.lower():
                            continue
                        language = txt
                        break
            
            # Studio
            studio = None
            studio_link = soup.find('a', href=True)
            if studio_link and '/studio/' in studio_link['href']:
                studio = studio_link.get_text(strip=True)
            else:
                for h in soup.find_all(['h2','h3','h4']):
                    if 'studio' in h.get_text(strip=True).lower():
                        sib = h.find_next_sibling()
                        if sib:
                            a = sib.find('a')
                            if a:
                                studio = a.get_text(strip=True)
                                break
            
            film['language'] = language
            film['studio'] = studio
        except Exception:
            pass

    def _parse_genres_page(self, film: dict, html: Optional[str]):
        """Parse genres page"""
        if not html:
            return
            
        try:
            soup = BeautifulSoup(html, 'lxml')
            genres = []
            
            label = soup.find(lambda t: t.name in ['dt','h2','h3','h4','strong','span','p'] and 'genres' in t.get_text(strip=True).lower())
            if label:
                candidate = label.find_next_sibling()
                if candidate:
                    for a in candidate.find_all('a'):
                        txt = a.get_text(strip=True)
                        if txt and txt.lower() not in ('show all', ''):
                            genres.append(txt)
            else:
                tab = soup.select_one('#tab-genres') or soup
                if tab:
                    for child in tab.descendants:
                        if getattr(child, 'name', None) and child.name in ['h2','h3','h4'] and 'theme' in child.get_text(strip=True).lower():
                            break
                        if getattr(child, 'name', None) and child.name == 'a':
                            txt = child.get_text(strip=True)
                            if txt and txt.lower() not in ('show all', ''):
                                genres.append(txt)
            
            # Dedupe
            if genres:
                seen = set()
                film['genres'] = [g for g in genres if g not in seen and not seen.add(g)]
            else:
                film['genres'] = []
        except Exception:
            pass

    async def _enrich_films_requests(self, films: List[dict], max_concurrency: int):
        """Fallback enrichment using requests (slower but reliable)"""
        headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
        semaphore = asyncio.Semaphore(max_concurrency)

        async def _enrich_single(film: dict):
            async with semaphore:
                film_path = film.get("film_path")
                if not film_path:
                    return

                if not film_path.startswith("/"):
                    film_path = "/" + film_path
                if not film_path.startswith("/film/") and "/film/" not in film_path:
                    film_path = f"/film/{film_path}"

                base_url = f"https://letterboxd.com{film_path}"

                def fetch_url(u):
                    for attempt in range(3):
                        try:
                            r = requests.get(u, headers=headers, timeout=15)
                            if r.status_code == 200:
                                return r.text
                            elif r.status_code == 429:  # Rate limited
                                time.sleep((attempt + 1) * 2)
                            else:
                                return None
                        except Exception:
                            time.sleep(0.5)
                    return None

                fetch_start = time.time()
                results = await asyncio.gather(
                    asyncio.to_thread(fetch_url, base_url),
                    asyncio.to_thread(fetch_url, base_url.rstrip('/') + '/crew/'),
                    asyncio.to_thread(fetch_url, base_url.rstrip('/') + '/details/'),
                    asyncio.to_thread(fetch_url, base_url.rstrip('/') + '/genres/'),
                )
                fetch_elapsed = time.time() - fetch_start
                self.stats["enrich_fetch_time_total"] += fetch_elapsed

                main_html, crew_html, details_html, genres_html = results
                
                if main_html or crew_html:
                    self.stats["enrich_success_count"] += 1
                else:
                    self.stats["enrich_fail_count"] += 1

                parse_start = time.time()
                self._parse_main_page(film, main_html)
                self._parse_crew_page(film, crew_html)
                self._parse_details_page(film, details_html)
                self._parse_genres_page(film, genres_html)
                parse_elapsed = time.time() - parse_start
                self.stats["enrich_parse_time_total"] += parse_elapsed

        tasks = [asyncio.create_task(_enrich_single(f)) for f in films]
        await asyncio.gather(*tasks, return_exceptions=True)

    def get_stats(self) -> dict:
        """Return a shallow copy of current runtime stats."""
        return dict(self.stats)

    async def fetch_person_image(self, person_type: str, person_name: str) -> Optional[str]:
        """
        Fetch the profile image for an actor or director from their Letterboxd page.
        
        Args:
            person_type: Either "actor" or "director"
            person_name: Name of the person (will be URL-slugified)
            
        Returns:
            Image URL or None if not found
        """
        # Convert name to URL slug (e.g., "Ellen Burstyn" -> "ellen-burstyn")
        slug = person_name.lower().replace(" ", "-").replace("'", "").replace(".", "")
        # Remove any non-alphanumeric characters except hyphens
        slug = re.sub(r'[^a-z0-9\-]', '', slug)
        
        url = f"https://letterboxd.com/{person_type}/{slug}/"
        
        try:
            print(f"[FETCH_PERSON_IMAGE] Fetching image for {person_name} from {url}", flush=True)
            if AIOHTTP_AVAILABLE:
                async with aiohttp.ClientSession() as session:
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                        if resp.status != 200:
                            return None
                        html = await resp.text()
            else:
                resp = requests.get(url, timeout=10)
                if resp.status_code != 200:
                    return None
                html = resp.text
            
            soup = BeautifulSoup(html, "html.parser")
            
            # Skip og:image as it's usually the default share image, not the profile photo
            # Look for the actual profile photo - check multiple possible locations
            
            # Method 1: Look for profile photo in the header section
            profile_section = soup.find("section", class_="profile-header") or soup.find("div", class_="profile-header")
            if profile_section:
                profile_img = profile_section.find("img")
                if profile_img:
                    img_url = profile_img.get("src") or profile_img.get("data-src") or profile_img.get("data-original")
                    if img_url:
                        if img_url.startswith("//"):
                            img_url = "https:" + img_url
                        elif img_url.startswith("/"):
                            img_url = "https://letterboxd.com" + img_url
                        # Skip default images
                        if img_url and "default-share" not in img_url and ("ltrbxd.com" in img_url or "s3" in img_url or "amazonaws.com" in img_url):
                            print(f"[FETCH_PERSON_IMAGE] Found profile header img for {person_name}: {img_url}", flush=True)
                            return img_url
            
            # Method 2: Look for avatar class (but skip if it's the default)
            avatar = soup.find("img", class_="avatar")
            if avatar:
                img_url = avatar.get("src") or avatar.get("data-src") or avatar.get("data-original")
                if img_url:
                    if img_url.startswith("//"):
                        img_url = "https:" + img_url
                    elif img_url.startswith("/"):
                        img_url = "https://letterboxd.com" + img_url
                    # Skip default images
                    if img_url and "default-share" not in img_url and ("ltrbxd.com" in img_url or "s3" in img_url or "amazonaws.com" in img_url):
                        print(f"[FETCH_PERSON_IMAGE] Found avatar img for {person_name}: {img_url}", flush=True)
                        return img_url
            
            # Method 3: Look in script tags for profile image data (like we do for film posters)
            for script in soup.find_all("script"):
                text = script.string or ""
                # Look for profile image patterns in JSON-LD or other data
                matches = re.findall(r'https://[^"\'<>\s]*\.(?:jpg|jpeg|png|webp)', text, re.IGNORECASE)
                for match in matches:
                    if "default-share" not in match and ("ltrbxd.com" in match or "s3" in match or "amazonaws.com" in match):
                        print(f"[FETCH_PERSON_IMAGE] Found script img for {person_name}: {match}", flush=True)
                        return match
            
            # Method 4: Look for any img with the person's name in alt or title
            for img in soup.find_all("img"):
                alt = img.get("alt", "").lower()
                title = img.get("title", "").lower()
                name_lower = person_name.lower()
                if name_lower in alt or name_lower in title:
                    img_url = img.get("src") or img.get("data-src") or img.get("data-original")
                    if img_url:
                        if img_url.startswith("//"):
                            img_url = "https:" + img_url
                        elif img_url.startswith("/"):
                            img_url = "https://letterboxd.com" + img_url
                        if img_url and "default-share" not in img_url and ("ltrbxd.com" in img_url or "s3" in img_url or "amazonaws.com" in img_url):
                            print(f"[FETCH_PERSON_IMAGE] Found named img for {person_name}: {img_url}", flush=True)
                            return img_url
            
            print(f"[FETCH_PERSON_IMAGE] No image found for {person_name}", flush=True)
            return None
            
        except Exception as e:
            return None

    async def fetch_person_images(self, persons: List[dict], person_type: str, max_concurrency: int = 5) -> List[dict]:
        """
        Fetch images for multiple actors or directors concurrently.
        
        Args:
            persons: List of dicts with 'name' key
            person_type: Either "actor" or "director"
            max_concurrency: Max concurrent requests
            
        Returns:
            Same list with 'image_url' added to each dict
        """
        semaphore = asyncio.Semaphore(max_concurrency)
        
        async def fetch_with_semaphore(person: dict) -> dict:
            async with semaphore:
                name = person.get("name", "")
                image_url = await self.fetch_person_image(person_type, name)
                return {**person, "image_url": image_url}
        
        tasks = [fetch_with_semaphore(p) for p in persons]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle any exceptions by returning original dict without image
        final_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                final_results.append({**persons[i], "image_url": None})
            else:
                final_results.append(result)
        
        return final_results
