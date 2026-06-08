# Schulrecht am MWG Bayreuth

Interaktive Lernwebsite zur Hausordnung des Markgräfin Wilhelmine Gymnasiums Bayreuth.

## Deployment auf GitHub Pages

1. Repository auf GitHub anlegen
2. Alle drei Dateien hochladen: `index.html`, `style.css`, `main.js`
3. Im Repository → **Settings** → **Pages** → Source: `main` Branch, Root `/`
4. Fertig — die Seite ist unter `https://<username>.github.io/<repo>/` erreichbar

Alle Pfade sind relativ. Kein Build-Schritt, kein Server nötig.

## Lokal öffnen

Einfach `index.html` im Browser öffnen. Für Web Audio API unter Chrome ggf. einen lokalen Server verwenden:

```
npx serve .
```

## Inhalt

6 interaktive Sektionen (~7 Minuten):
1. Hero / Intro
2. Grundlagen + Mini-Quiz (2 Fragen)
3. Unterricht & Pausen + Zuordnungsübung (5 Situationen)
4. Pflichten & Rechte — Entscheidungsszenarien (3 Szenarien)
5. Mini Escape Room "Schließzeit" (3-stelliger Code: 832)
6. Abschluss, Score, Quellen

## Quellen

- Hausordnung MWG Bayreuth, Stand Juli 2023
- GSO Bayern, Bayerisches Staatsministerium für Unterricht und Kultus
