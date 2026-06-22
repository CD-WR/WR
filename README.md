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

## Bilder / Assets

Im Ordner `assets/img/` liegen das MWG-Logo und einige Fotos, die von
`www.mwg-bayreuth.de` stammen.

⚠️ **Urheber- & Persönlichkeitsrecht:** Logo und Fotos gehören dem Markgräfin
Wilhelmine Gymnasium Bayreuth. Die Fotos zeigen erkennbare Personen. Für eine
**interne** Präsentation (im Unterricht) ist das vertretbar. Vor einer
**öffentlichen** Veröffentlichung (z. B. GitHub Pages) solltest du entweder
nur das Logo verwenden oder die Einwilligung der Schule / abgebildeten Personen
einholen. Die Fotos sind im CSS bewusst stark verfremdet (Duotone, reduzierte
Deckkraft) eingebunden.

## Animationen

Alle Bewegungen sind natives CSS/JS ohne Build-Schritt (kein Remotion nötig):
Ken-Burns-Zoom auf dem Hero-Hintergrund, Clip-Path-Reveal der Galerie,
Section-Fades, Typewriter, Combo-Anzeige. `prefers-reduced-motion` wird
respektiert.

## Quellen

- Hausordnung MWG Bayreuth, Stand Juli 2023
- GSO Bayern, Bayerisches Staatsministerium für Unterricht und Kultus
