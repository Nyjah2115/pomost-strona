# Pomost: strona koncepcyjna

Zwykła strona w HTML, CSS i JavaScript. Nie trzeba niczego instalować ani budować.

Na żywo: https://nyjah2115.github.io/pomost-strona/

## Jak otworzyć

- Najprościej kliknij dwa razy `index.html`.
- Albo przez lokalny serwer: w tym folderze uruchom `python3 -m http.server 8000` i otwórz http://localhost:8000.

Formularz zapisu wysyła dane dopiero na hostingu (patrz niżej). Lokalnie pokaże komunikat o błędzie wysyłki.

## Jak opublikować

- **GitHub Pages (obecnie):** strona publikuje się sama z gałęzi `main` po każdym `git push`. GitHub Pages nie obsługuje formularzy, więc zapis zadziała dopiero po podłączeniu Formspree: załóż formularz na formspree.io i wklej jego adres w `app.js` w stałej `FORM_ENDPOINT`.
- **Netlify:** przeciągnij cały folder na https://app.netlify.com/drop. Formularz zadziała od razu dzięki Netlify Forms, a zgłoszenia zobaczysz w panelu Netlify w zakładce Forms.
- **Inny hosting** (Vercel, własny serwer): wgraj wszystkie pliki i podłącz formularz jak przy GitHub Pages.
- Obrazek do podglądu linku (`og:image` i `og:url` w `index.html`) wskazuje na adres z GitHub Pages. Przy innej domenie podmień go na `https://twoja-domena/assets/og.jpg`.

## Co gdzie jest

- `index.html`: treść strony
- `styles.css`: wygląd
- `app.js`: wybór piętra, przeloty kamery, karuzela udogodnień i formularz
- `assets/picker`: budynek, wnętrza i drugie pomieszczenia (wersje 2752 px i 1440 px)
- `assets/video`: przeloty kamery, wersja na komputer i na telefon (`-m`), bez dźwięku
- `assets/photos`, `assets/icons`: zdjęcia sekcji i ikony
- `404.html`: strona „Nie ma takiego piętra”

## Zmiana danych

Metraże, ceny i liczba wolnych mieszkań są w `app.js` w tablicy `FLOORS`. Opisy mieszkań, pomieszczeń i punkty w środku są w `ZONES`. Obrys pięter na zdjęciu budynku to `SLABS`. Ceny i liczby w panelu przy pierwszym wczytaniu (piętro 6) są też wpisane w `index.html`.

Wszystkie zdjęcia i filmy wygenerowano w Higgsfield. Budynek, ceny i wizualizacje są fikcyjne.
