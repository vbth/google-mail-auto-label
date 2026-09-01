# Google Mail Auto-Label 2.19

Google-Apps-Script, das Gmail-Labels nach festen Regeln vergibt – ohne KI-Bewertung, ohne Datenabfluss. Dazu eine Anleitung, wie sich die vergebenen Labels per Scheduled Task in Claude auswerten lassen.

## Inhalt des Pakets

| Datei | Zweck |
|---|---|
| `gmail-auto-label.gs` | Das Skript. Kompletter Inhalt in ein Apps-Script-Projekt einfügen. |
| `keywords.gs` | Alle Suchbegriffe und Absenderadressen, eine Zeile je Eintrag. Gehört als zweite Datei ins selbe Projekt. |
| `bedienungsanleitung.md` | Einrichtung, Betrieb, Wartung, bekannte Grenzen, Glossar. |
| `claude-scheduled-tasks.md` | Auswertung der Labels über Claude Cowork, mit fertigen Prompts. |
| `CHANGELOG.md` | Versionsverlauf 1.0 bis 2.18, mit den Upgrade-Schritten je Version. |

## Schnellstart

1. `script.google.com` → **Neues Projekt**, Name „Gmail Auto-Label"
2. Beispielcode löschen, Inhalt von `gmail-auto-label.gs` einfügen, speichern
3. Zweite Datei anlegen: Plus neben „Dateien" → **Script**, Name `keywords`, Beispielinhalt löschen, Inhalt von `keywords.gs` einfügen.
4. **Projekteinstellungen (Zahnrad) → Zeitzone auf `Europe/Berlin`** – neue Projekte stehen oft auf `America/New_York`, wodurch die Datumsgrenzen der Suche verrutschen
5. Funktion `dryRun` ausführen, Gmail-Berechtigung erteilen, Ausführungsprotokoll prüfen
6. Funktion `labelAll` ausführen
7. Trigger anlegen (Uhr-Symbol → Trigger hinzufügen), Funktion `labelAll`

Bei einem gewachsenen Postfach braucht die Erstbefüllung viele Durchläufe – siehe `bedienungsanleitung.md`, Abschnitt „Erstbefüllung".

## Zuordnung nachjustieren

Sämtliches Vokabular steht in `keywords.gs`, gegliedert in Sektionen – je Kategorie eine für Suchbegriffe und eine für Absenderadressen:

```
[einkauf]
rechnung
lieferschein

[einkauf.absender]
rechnung@telekom.de
@amazon.de
```

Speichern genügt, die Datei wird bei jedem Lauf frisch gelesen. Neue Einträge greifen damit sofort für neu eingehende Mails; sollen auch ältere Mails erneut bewertet werden, einmal `resetRunTimestamp` ausführen. `showKeywords()` zeigt, was das Skript aus der Datei gelesen hat. Details in `bedienungsanleitung.md`, Abschnitt „Keywords und Absender pflegen".
