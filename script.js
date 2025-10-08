// Données globales des films/séries (clé en minuscule)
var films = {};

// Liste actuelle des éléments OMDb affichés
var currentItems = [];
var currentSearchTerm = '';
var currentPage = 1;
var totalResults = 0;
var isLoading = false;

function afficherFilm() {
    var film = document.getElementById('filmName').value.trim();
    if (!film) return;
    var key = getOmdbKey();
    if (!key) {
        // fallback local data
        var local = films[film.toLowerCase()];
        if (local) {
            fillDetailFromLocal(local);
        } else {
            showNotFound();
        }
        return;
    }
    fetch('https://www.omdbapi.com/?apikey=' + encodeURIComponent(key) + '&t=' + encodeURIComponent(film) + '&plot=full')
        .then(function(r){ return r.json(); })
        .then(function(data){
            if (data && data.Response === 'True') {
                fillDetailFromOmdb(data);
            } else {
                showNotFound();
            }
        })
        .catch(function(){ showNotFound(); });
}

function fillDetailFromLocal(f) {
    document.getElementById('titreFilm').textContent = f.titre;
    document.getElementById('realisateurFilm').textContent = "Réalisateur : " + f.realisateur;
    document.getElementById('anneeFilm').textContent = "Année de sortie : " + f.annee;
    document.getElementById('genreFilm').textContent = "Genre : " + f.genre;
    document.getElementById('synopsisFilm').textContent = "Synopsis : " + f.synopsis;
    document.getElementById('afficheFilm').src = f.affiche;
    document.getElementById('afficheFilm').style.display = "block";
    document.getElementById('lienBandeAnnonce').style.display = "none";
}

function fillDetailFromOmdb(data) {
    document.getElementById('titreFilm').textContent = cleanTitle(data.Title || '');
    document.getElementById('realisateurFilm').textContent = data.Director ? ("Réalisateur : " + data.Director) : '';
    document.getElementById('anneeFilm').textContent = data.Year ? ("Année de sortie : " + data.Year) : '';
    document.getElementById('genreFilm').textContent = data.Genre ? ("Genre : " + data.Genre) : '';
    document.getElementById('synopsisFilm').textContent = data.Plot ? ("Synopsis : " + data.Plot) : '';
    var poster = (data.Poster && data.Poster !== 'N/A') ? data.Poster : '';
    if (poster) {
        document.getElementById('afficheFilm').src = poster;
        document.getElementById('afficheFilm').style.display = "block";
    } else {
        document.getElementById('afficheFilm').style.display = "none";
    }
    document.getElementById('lienBandeAnnonce').style.display = "none";
}

function showNotFound() {
        document.getElementById('titreFilm').textContent = "Film non trouvé.";
        document.getElementById('afficheFilm').style.display = "none";
        document.getElementById('realisateurFilm').textContent = "";
        document.getElementById('anneeFilm').textContent = "";
        document.getElementById('genreFilm').textContent = "";
        document.getElementById('synopsisFilm').textContent = "";
        document.getElementById('lienBandeAnnonce').style.display = "none";
    }

// Rendu de la galerie de tous les films
function renderGallery(filteredKeys) {
    var container = document.getElementById('gallery');
    if (!container) return;
    container.innerHTML = "";
    // OMDb mode: render from currentItems if available
    var key = getOmdbKey();
    if (key) {
        if (!currentItems || currentItems.length === 0) {
            renderGalleryFromOmdb(key);
            return;
        }
        renderGalleryFromItems(currentItems);
        return;
    }
    // Fallback local mode
    var keys = filteredKeys || getSortedKeys(Object.keys(films));
    keys.forEach(function(key) { appendLocalCard(container, key, films[key]); });
    paintFavoriteButtons();
}

function appendLocalCard(container, key, f) {
    var card = document.createElement('div');
    card.className = 'card';
    card.innerHTML =
        '<a href="film.html?id=' + encodeURIComponent(key) + '"><img src="' + f.affiche + '" alt="' + f.titre + '"></a>' +
        '<div class="card-body">' +
        '<h3><a href="film.html?id=' + encodeURIComponent(key) + '">' + f.titre + '</a></h3>' +
        '<p>' + f.realisateur + ' • ' + f.annee + '</p>' +
        '<p class="genre">' + f.genre + '</p>' +
        '<div class="card-actions">' +
        '<a class="btn" href="film.html?id=' + encodeURIComponent(key) + '">Détails</a>' +
        '<button class="btn favorite" data-key="' + key + '" onclick="toggleFavorite(\'' + key + '\')">★</button>' +
        '</div>' +
        '</div>';
    container.appendChild(card);
}

function renderGalleryFromOmdb(apiKey) {
    var container = document.getElementById('gallery');
    if (!container) return;
    container.innerHTML = "";
    setLoading(true);
    if (currentSearchTerm) {
        fetchOmdbPage(apiKey, currentSearchTerm, currentPage).then(function(res){
            currentItems = uniqueById(res.items || []);
            totalResults = res.total;
            renderGalleryFromItems(currentItems);
            buildFilters();
            updatePagination();
            setLoading(false);
        });
    } else {
        // Example queries to seed gallery
        var seeds = ['batman', 'avatar', 'inception', 'dune', 'matrix', 'parasite'];
        var promises = seeds.map(function(q){
            return fetch('https://www.omdbapi.com/?apikey=' + encodeURIComponent(apiKey) + '&s=' + encodeURIComponent(q) + '&type=movie')
                .then(function(r){ return r.json(); })
                .then(function(res){ return (res && res.Search) ? res.Search : []; })
                .catch(function(){ return []; });
        });
        Promise.all(promises).then(function(results){
            var items = [];
            results.forEach(function(list){ items = items.concat(list); });
            var uniq = {};
            items.forEach(function(it){ if (it.imdbID) uniq[it.imdbID] = it; });
            var finalList = Object.keys(uniq).map(function(id){ return uniq[id]; });
            currentItems = finalList.slice(0, 24);
            totalResults = currentItems.length;
            renderGalleryFromItems(currentItems);
            buildFilters();
            updatePagination();
            setLoading(false);
        });
    }
}

function renderGalleryFromItems(items) {
    var container = document.getElementById('gallery');
    if (!container) return;
    container.innerHTML = "";
    var sorted = getSortedOmdbItems(uniqueById(items || []));
    sorted.forEach(function(it){
        var poster = (it.Poster && it.Poster !== 'N/A') ? it.Poster : getPlaceholderPoster();
        var placeholder = getPlaceholderPoster();
        var title = cleanTitle(it.Title||'');
        var card = document.createElement('div');
        card.className = 'card';
        card.innerHTML =
            '<a href="film.html?id=' + encodeURIComponent(it.imdbID) + '"><img loading="lazy" src="' + poster + '" alt="' + title + '" onerror="this.onerror=null;this.src=\'' + placeholder + '\';"></a>' +
            '<div class="card-body">' +
            '<h3><a href="film.html?id=' + encodeURIComponent(it.imdbID) + '">' + title + '</a></h3>' +
            '<p>' + (it.Year||'') + '</p>' +
            '<div class="card-actions">' +
            '<a class="btn" href="film.html?id=' + encodeURIComponent(it.imdbID) + '">Détails</a>' +
            '<button class="btn favorite" data-key="' + it.imdbID + '" onclick="toggleFavorite(\'' + it.imdbID + '\')">★</button>' +
            '</div>' +
            '</div>';
        container.appendChild(card);
    });
    paintFavoriteButtons();
}

function selectFilm(key) {
    document.getElementById('filmName').value = films[key].titre;
    afficherFilm();
}

// Suggestions via datalist
function populateSuggestions() {
    var datalist = document.getElementById('filmSuggestions');
    if (!datalist) return;
    datalist.innerHTML = "";
    // Suggestions basées sur les éléments OMDb en cours
    (currentItems || []).forEach(function(it) {
        var option = document.createElement('option');
        option.value = it.Title || '';
        datalist.appendChild(option);
    });
}

// Filtres
function buildFilters() {
    var genreSelect = document.getElementById('filterGenre');
    var yearSelect = document.getElementById('filterYear');
    var key = getOmdbKey();
    if (key) {
        // In OMDb mode, derive only years from currentItems; disable genre select
        var years = [];
        (currentItems || []).forEach(function(it){
            var y = parseInt(String(it.Year || '').slice(0,4), 10);
            if (!isNaN(y)) years.push(y);
        });
        years = Array.from(new Set(years)).sort(function(a,b){return a-b;});
        if (genreSelect) {
            genreSelect.innerHTML = '<option value="">Genres (désactivé en mode OMDb)</option>';
            genreSelect.disabled = true;
        }
        if (yearSelect) {
            yearSelect.innerHTML = '<option value="">Toutes les années</option>' + years.map(function(y){return '<option value="' + y + '">' + y + '</option>';}).join('');
            yearSelect.disabled = false;
        }
        return;
    }
    // Local fallback
    var genreSet = {};
    var yearsLocal = [];
    Object.keys(films).forEach(function(key) {
        var f = films[key];
        f.genre.split(',').map(function(g) { return g.trim(); }).forEach(function(g) { genreSet[g] = true; });
        yearsLocal.push(parseInt(f.annee, 10));
    });
    var genres = Object.keys(genreSet).sort();
    yearsLocal = Array.from(new Set(yearsLocal)).sort(function(a, b) { return a - b; });
    if (genreSelect) {
        genreSelect.innerHTML = '<option value="">Tous les genres</option>' + genres.map(function(g){return '<option value="' + g + '">' + g + '</option>';}).join('');
        genreSelect.disabled = false;
    }
    if (yearSelect) {
        yearSelect.innerHTML = '<option value="">Toutes les années</option>' + yearsLocal.map(function(y){return '<option value="' + y + '">' + y + '</option>';}).join('');
        yearSelect.disabled = false;
    }
}

function applyFilters() {
    var genreSelect = document.getElementById('filterGenre');
    var yearSelect = document.getElementById('filterYear');
    var genre = genreSelect ? genreSelect.value : '';
    var year = yearSelect ? yearSelect.value : '';
    var key = getOmdbKey();
    if (key) {
        var filtered = (currentItems || []).filter(function(it){
            var matchYear = !year || String(it.Year||'').indexOf(String(year)) === 0;
            return matchYear;
        });
        renderGalleryFromItems(filtered);
        return;
    }
    var keys = Object.keys(films).filter(function(k) {
        var f = films[k];
        var matchGenre = !genre || f.genre.indexOf(genre) !== -1;
        var matchYear = !year || f.annee === String(year);
        return matchGenre && matchYear;
    });
    renderGallery(getSortedKeys(keys));
}

// Favoris via localStorage
function getFavorites() {
    try {
        var raw = localStorage.getItem('favorites');
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function setFavorites(list) {
    try {
        localStorage.setItem('favorites', JSON.stringify(list));
    } catch (e) {}
}

function toggleFavorite(key) {
    var favs = getFavorites();
    if (favs.indexOf(key) === -1) {
        favs.push(key);
    } else {
        favs = favs.filter(function(k) { return k !== key; });
    }
    setFavorites(favs);
    paintFavoriteButtons();
    renderFavorites();
}

function paintFavoriteButtons() {
    var favs = getFavorites();
    var buttons = document.querySelectorAll('.btn.favorite');
    for (var i = 0; i < buttons.length; i++) {
        var key = buttons[i].getAttribute('data-key');
        if (favs.indexOf(key) !== -1) {
            buttons[i].classList.add('active');
        } else {
            buttons[i].classList.remove('active');
        }
    }
}

function renderFavorites() {
    var favsContainer = document.getElementById('favorites');
    if (!favsContainer) return;
    var favs = getFavorites();
    favsContainer.innerHTML = "";
    if (favs.length === 0) {
        favsContainer.innerHTML = '<p>Aucun favori pour le moment.</p>';
        return;
    }
    // In OMDb mode, fetch details to render favorite items
    var key = getOmdbKey();
    if (key) {
        favs.forEach(function(imdbID){
            fetch('https://www.omdbapi.com/?apikey=' + encodeURIComponent(key) + '&i=' + encodeURIComponent(imdbID))
                .then(function(r){ return r.json(); })
                .then(function(data){
                    if (!data || data.Response !== 'True') return;
                    var poster = (data.Poster && data.Poster !== 'N/A') ? data.Poster : getPlaceholderPoster();
                    var item = document.createElement('div');
                    item.className = 'fav-item';
                    item.innerHTML =
                        '<img loading="lazy" src="' + poster + '" alt="' + (data.Title||'') + '">' +
                        '<div class="fav-body">' +
                        '<h4>' + (data.Title||'') + '</h4>' +
                        '<p>' + (data.Year||'') + '</p>' +
                        '<a class="btn" href="film.html?id=' + encodeURIComponent(imdbID) + '">Voir</a>' +
                        '<button class="btn favorite active" onclick="toggleFavorite(\'' + imdbID + '\')">Retirer</button>' +
                        '</div>';
                    favsContainer.appendChild(item);
                });
        });
        return;
    }
    // Local fallback (rare now)
    favs.forEach(function(k) {
        if (!films[k]) return;
        var f = films[k];
        var item = document.createElement('div');
        item.className = 'fav-item';
        item.innerHTML =
            '<img src="' + f.affiche + '" alt="' + f.titre + '">' +
            '<div class="fav-body">' +
            '<h4>' + f.titre + '</h4>' +
            '<p>' + f.realisateur + ' • ' + f.annee + '</p>' +
            '<a class="btn" href="film.html?id=' + encodeURIComponent(k) + '">Voir</a>' +
            '<button class="btn favorite active" onclick="toggleFavorite(\'' + k + '\')">Retirer</button>' +
            '</div>';
        favsContainer.appendChild(item);
    });
}

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    // Theme persistence
    var savedTheme = getSavedTheme();
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('theme-dark');
    }
    var themeBtn = document.getElementById('themeToggle');
    if (themeBtn) themeBtn.addEventListener('click', function(){
        var isDark = document.documentElement.classList.toggle('theme-dark');
        saveTheme(isDark ? 'dark' : 'light');
    });

    // OMDb key persistence (no default key set)
    var keyInput = document.getElementById('omdbKey');
    var saveBtn = document.getElementById('saveOmdbKey');
    if (keyInput) keyInput.value = getOmdbKey() || '';
    if (saveBtn) saveBtn.addEventListener('click', function(){
        setOmdbKey(keyInput.value.trim());
        alert('Clé OMDb enregistrée.');
        renderGallery();
    });
    var settingsToggle = document.getElementById('settingsToggle');
    var advanced = document.getElementById('advancedControls');
    if (settingsToggle && advanced) settingsToggle.addEventListener('click', function(){
        advanced.style.display = (advanced.style.display === 'none' || advanced.style.display === '') ? 'grid' : 'none';
    });

    // Initial renders
    renderGallery();
    populateSuggestions();
    buildFilters();
    renderFavorites();

    var input = document.getElementById('filmName');
    if (input) {
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                afficherFilm();
            }
        });
        input.addEventListener('input', debounce(function(){
            var term = input.value.trim();
            var key = getOmdbKey();
            if (!key || !term) return;
            fetchOmdbPage(key, term, 1).then(function(res){
                currentItems = res.items;
                populateSuggestions();
            });
        }, 400));
    }
    var genreSelect = document.getElementById('filterGenre');
    var yearSelect = document.getElementById('filterYear');
    if (genreSelect) genreSelect.addEventListener('change', applyFilters);
    if (yearSelect) yearSelect.addEventListener('change', applyFilters);

    var sortSelect = document.getElementById('sortSelect');
    if (sortSelect) sortSelect.addEventListener('change', function(){
        saveSort(sortSelect.value);
        applyFilters();
    });

    var globalSearch = document.getElementById('globalSearch');
    var globalSearchBtn = document.getElementById('globalSearchBtn');
    if (globalSearchBtn) globalSearchBtn.addEventListener('click', function(){
        var term = (globalSearch && globalSearch.value.trim()) || '';
        currentSearchTerm = term;
        currentPage = 1;
        renderGallery();
    });
    if (globalSearch) globalSearch.addEventListener('keydown', function(e){
        if (e.key === 'Enter') {
            currentSearchTerm = globalSearch.value.trim();
            currentPage = 1;
            renderGallery();
        }
    });
    if (globalSearch) globalSearch.addEventListener('input', debounce(function(){
        var term = globalSearch.value.trim();
        if (!term) return;
        currentSearchTerm = term;
        currentPage = 1;
        var key = getOmdbKey();
        if (!key) return;
        setLoading(true);
        fetchOmdbPage(key, term, 1).then(function(res){
            currentItems = res.items;
            totalResults = res.total;
            populateSuggestions();
            renderGalleryFromItems(currentItems);
            buildFilters();
            updatePagination();
            setLoading(false);
        }).catch(function(){ setLoading(false); });
    }, 400));

    var prevPageBtn = document.getElementById('prevPage');
    var nextPageBtn = document.getElementById('nextPage');
    if (prevPageBtn) prevPageBtn.addEventListener('click', function(){
        if (isLoading) return;
        if (!currentSearchTerm) return;
        if (currentPage > 1) {
            currentPage -= 1;
            renderGallery();
        }
    });
    if (nextPageBtn) nextPageBtn.addEventListener('click', function(){
        if (isLoading) return;
        if (!currentSearchTerm) return;
        var maxPage = Math.ceil((totalResults||0) / 10);
        if (currentPage < maxPage) {
            currentPage += 1;
            renderGallery();
        }
    });

    var quickCats = document.getElementById('quickCats');
    if (quickCats) quickCats.addEventListener('click', function(e){
        var btn = e.target.closest('button[data-cat]');
        if (!btn) return;
        var map = {
            'action': 'action movie',
            'drama': 'drama movie',
            'sci-fi': 'science fiction',
            'comedy': 'comedy movie',
            'horror': 'horror movie'
        };
        var term = map[btn.getAttribute('data-cat')] || '';
        var globalSearch = document.getElementById('globalSearch');
        if (globalSearch) globalSearch.value = term;
        currentSearchTerm = term;
        currentPage = 1;
        renderGallery();
    });
});

function fetchOmdbPage(apiKey, term, page) {
    return fetch('https://www.omdbapi.com/?apikey=' + encodeURIComponent(apiKey) + '&s=' + encodeURIComponent(term) + '&type=movie&page=' + encodeURIComponent(page))
        .then(function(r){ return r.json(); })
        .then(function(res){
            var items = (res && res.Search) ? res.Search : [];
            var total = (res && res.totalResults) ? parseInt(res.totalResults, 10) : items.length;
            return { items: items, total: total };
        })
        .catch(function(){ return { items: [], total: 0 }; });
}

function updatePagination() {
    var prev = document.getElementById('prevPage');
    var next = document.getElementById('nextPage');
    var maxPage = Math.ceil((totalResults||0) / 10) || 1;
    if (prev) prev.disabled = currentPage <= 1;
    if (next) next.disabled = currentPage >= maxPage;
}

function setLoading(state) {
    var loader = document.getElementById('loader');
    if (!loader) return;
    loader.style.display = state ? 'block' : 'none';
    isLoading = !!state;
}

// --- Utilitaires ---
function debounce(fn, wait) {
    var timeout;
    return function() {
        var context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function(){ fn.apply(context, args); }, wait);
    };
}

function getPlaceholderPoster() {
    // Simple data URI placeholder (gray background with text)
    return 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><rect width="100%" height="100%" fill="#ddd"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#666" font-size="20">Aucune image</text></svg>');
}

function cleanTitle(raw) {
    // Remove common edition qualifiers inside parentheses when they clutter the UI
    var cleaned = String(raw).replace(/\s*\((IMAX|Extended|Ultimate Edition|Ultimate Cut|Director'?s Cut|Special Edition|Unrated|Remastered)\)$/i, '');
    return cleaned.trim();
}

function uniqueById(items) {
    var seen = {};
    var out = [];
    for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var id = it && it.imdbID;
        if (!id || seen[id]) continue;
        seen[id] = true;
        out.push(it);
    }
    return out;
}

// --- Tri ---
function getSort() {
    try { return localStorage.getItem('sortOption') || ''; } catch(e) { return ''; }
}
function saveSort(value) {
    try { localStorage.setItem('sortOption', value || ''); } catch(e) {}
}
function getSortedKeys(keys) {
    var sort = getSort();
    var copy = keys.slice();
    if (sort === 'title-asc') {
        copy.sort(function(a,b){ return films[a].titre.localeCompare(films[b].titre); });
    } else if (sort === 'title-desc') {
        copy.sort(function(a,b){ return films[b].titre.localeCompare(films[a].titre); });
    } else if (sort === 'year-asc') {
        copy.sort(function(a,b){ return parseInt(films[a].annee,10) - parseInt(films[b].annee,10); });
    } else if (sort === 'year-desc') {
        copy.sort(function(a,b){ return parseInt(films[b].annee,10) - parseInt(films[a].annee,10); });
    }
    var sortSelect = document.getElementById('sortSelect');
    if (sortSelect && sortSelect.value !== sort) {
        sortSelect.value = sort;
    }
    return copy;
}

function getSortedOmdbItems(items) {
    var sort = getSort();
    var copy = items.slice();
    if (sort === 'title-asc') {
        copy.sort(function(a,b){ return String(a.Title||'').localeCompare(String(b.Title||'')); });
    } else if (sort === 'title-desc') {
        copy.sort(function(a,b){ return String(b.Title||'').localeCompare(String(a.Title||'')); });
    } else if (sort === 'year-asc') {
        copy.sort(function(a,b){ return parseInt(String(a.Year||'').slice(0,4),10) - parseInt(String(b.Year||'').slice(0,4),10); });
    } else if (sort === 'year-desc') {
        copy.sort(function(a,b){ return parseInt(String(b.Year||'').slice(0,4),10) - parseInt(String(a.Year||'').slice(0,4),10); });
    }
    var sortSelect = document.getElementById('sortSelect');
    if (sortSelect && sortSelect.value !== sort) {
        sortSelect.value = sort;
    }
    return copy;
}

// --- Thème ---
function saveTheme(mode) {
    try { localStorage.setItem('themeMode', mode); } catch(e) {}
}
function getSavedTheme() {
    try { return localStorage.getItem('themeMode'); } catch(e) { return null; }
}

// --- OMDb key helpers ---
function getOmdbKey() {
    try { return localStorage.getItem('omdbKey'); } catch(e) { return null; }
}
function setOmdbKey(v) {
    try { if (v) localStorage.setItem('omdbKey', v); } catch(e) {}
}
