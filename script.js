function afficherFilm() {
    // Récupérer le nom du film entré par l'utilisateur
    var film = document.getElementById('filmName').value.toLowerCase();
    
    // Objets contenant les informations de 3 films
    var films = {
        "inception": {
            titre: "Inception",
            realisateur: "Christopher Nolan",
            annee: "2010",
            genre: "Science-fiction, Thriller",
            synopsis: "Dom Cobb est un voleur expérimenté, le meilleur dans l'art dangereux de l'extraction...",
            affiche: "inception.jpg",
            bandeAnnonce: "https://www.youtube.com/watch?v=YoHD9XEInc0"
        },
        "avatar": {
            titre: "Avatar",
            realisateur: "James Cameron",
            annee: "2009",
            genre: "Science-fiction, Aventure",
            synopsis: "Jake Sully, un ancien marine paraplégique, est envoyé sur Pandora...",
            affiche: "avatar.jpg",
            bandeAnnonce: "https://www.youtube.com/watch?v=5PSNL1qE6VY"
        },
        "titanic": {
            titre: "Titanic",
            realisateur: "James Cameron",
            annee: "1997",
            genre: "Drame, Romance",
            synopsis: "Un artiste pauvre et une jeune femme de la haute société tombent amoureux à bord du Titanic...",
            affiche: "titanic.jpg",
            bandeAnnonce: "https://www.youtube.com/watch?v=2e-eXJ6HgkQ"
        }
    };

    // Vérifier si le film existe dans l'objet
    if (films[film]) {
        // Remplir les informations du film dans le HTML
        document.getElementById('titreFilm').textContent = films[film].titre;
        document.getElementById('realisateurFilm').textContent = "Réalisateur : " + films[film].realisateur;
        document.getElementById('anneeFilm').textContent = "Année de sortie : " + films[film].annee;
        document.getElementById('genreFilm').textContent = "Genre : " + films[film].genre;
        document.getElementById('synopsisFilm').textContent = "Synopsis : " + films[film].synopsis;
        
        // Afficher l'affiche du film
        document.getElementById('afficheFilm').src = films[film].affiche;
        document.getElementById('afficheFilm').style.display = "block";
        
        // Afficher le lien vers la bande-annonce
        document.getElementById('lienBandeAnnonce').href = films[film].bandeAnnonce;
        document.getElementById('lienBandeAnnonce').style.display = "inline-block";
    } else {
        // Si le film n'est pas trouvé, afficher un message d'erreur
        document.getElementById('titreFilm').textContent = "Film non trouvé.";
        document.getElementById('afficheFilm').style.display = "none";
        document.getElementById('realisateurFilm').textContent = "";
        document.getElementById('anneeFilm').textContent = "";
        document.getElementById('genreFilm').textContent = "";
        document.getElementById('synopsisFilm').textContent = "";
        document.getElementById('lienBandeAnnonce').style.display = "none";
    }
}
