# Versionsverlauf

## 2.19 – 2026-09-01

### Keywords und Absender in eigener Datei

Sämtliches Vokabular ist aus dem Skript in die neue Datei `keywords.gs` gewandert – eine Zeile je Eintrag, gegliedert in Sektionen. Das Skript enthält keine Wortlisten mehr, nur noch die Logik; die ausführlichen Begründungen zu jedem Begriff stehen jetzt als Kommentare in jener Datei, also dort, wo bearbeitet wird.

`keywords.gs` ist eine ganz normale zweite Skriptdatei im selben Projekt – über das Plus neben „Dateien" mit **Script** angelegt, kein Sonderfall wie ein HTML-Anhang. Ihr gesamter Inhalt ist eine einzige Konstante, `KEYWORDS_TEXT`, ein mehrzeiliger Text zwischen zwei Backticks (`` ` ``). Alles zwischen den Backticks wird vom Skript als reiner Text gelesen und zeilenweise geparst, genau wie zuvor – ein Keyword pro Zeile, ohne Anführungszeichen und Komma. Einzige Einschränkung: Ein Backtick oder die Zeichenfolge `${` dürfen darin nicht vorkommen (Sonderbedeutung in JavaScript-Template-Strings), in Betreffzeilen, Absenderadressen und Anhangsnamen kommt beides praktisch nie vor.

**Zur Ladereihenfolge:** Apps Script garantiert bei mehreren `.gs`-Dateien im selben Projekt keine bestimmte Reihenfolge, in der ihr Code auf oberster Ebene ausgeführt wird. Damit das Skript unabhängig davon zuverlässig startet, liest `gmail-auto-label.gs` die Konstante `KEYWORDS_TEXT` nirgends auf oberster Ebene, sondern ausschließlich lazy beim ersten Aufruf von `labelAll`, `dryRun` oder `showKeywords` – zu diesem Zeitpunkt hat Apps Script bereits den gesamten Code aller Dateien ausgeführt, unabhängig von deren Reihenfolge im Projekt.

Format: `[sektionsname]` allein auf einer Zeile beginnt einen Abschnitt, jede weitere Zeile ist ein Eintrag, Zeilen ab `#` sind Kommentare, Leerzeilen und Groß-/Kleinschreibung sind egal. Die acht bisherigen Wortlisten entsprechen eins zu eins den Sektionen `[sicherheit]`, `[newsletter]`, `[newsletter.body]`, `[benachrichtigung]`, `[erinnerung]`, `[einkauf]`, `[einkauf.download]` und `[termin]`. Inhaltlich ist keine einzige Zeile hinzugekommen oder weggefallen – die Zuordnung arbeitet exakt wie in 2.18.

Gelesen wird die Datei einmal je Ausführung, nicht je Mail. Fehlt die Konstante `KEYWORDS_TEXT` (Datei fehlt oder falsch benannt), brechen `labelAll` und `dryRun` mit einer Meldung im Protokoll ab, statt stillschweigend nichts zu finden; die Aufräum- und Diagnosefunktionen bleiben benutzbar.

### Neu: Absenderadressen je Kategorie

Fünf zusätzliche Sektionen nehmen Absenderadressen statt Suchbegriffen auf: `[sicherheit.absender]`, `[newsletter.absender]`, `[benachrichtigung.absender]`, `[einkauf.absender]` und `[termin.absender]`. Im Auslieferungszustand sind sie leer.

Drei Schreibweisen: `rechnung@shop.de` (genau diese Adresse), `@shop.de` oder `shop.de` (die Domain samt Unterdomains). Anders als bei den Keywords wird **nicht** per Teilstring verglichen, sondern die Adresse exakt bzw. die Domain als Ganzes – `shop.de` trifft also weder `shop.de.beispiel.com` noch `fakeshop.de` noch einen Anzeigenamen, der „shop.de" enthält. Verglichen wird ausschließlich die Adresse aus `getFrom()`, nicht der frei wählbare Anzeigename.

Ein Treffer entscheidet sofort und überspringt jede Gegenprüfung: Er gilt auch bei gesetztem `List-Id` (`[sicherheit.absender]` schlägt damit die List-Id-Ausnahme), auch ohne Datum im Betreff (`[termin.absender]`) und auch dann, wenn die Mail nach Massenversand aussieht (`[einkauf.absender]` vor dem Bulk-Ausschluss). Im ersten Regelblock laufen die Absenderlisten für Newsletter und Benachrichtigung direkt hinter der Sicherheitsregel und noch vor der Massenmail-Prüfung. Die neue Reihenfolge lautet: **Sicherheit → Absenderlisten → Massenmail → Versandmeldung → Erinnerung → Abo-Vokabular.**

Damit lassen sich die Fälle geradeaus lösen, an denen die Keyword-Regeln scheitern: ein Versender, der Werbung als Transaktionsmail verschickt, oder ein Shop, dessen Rechnungen im Betreff keinen erkennbaren Begriff tragen. Vorlage für die Einträge ist `reportSenders()`. Das Protokoll von `labelBulkAndShipping` weist die Absenderlisten-Treffer separat aus.

### Änderungen an der Datei werden erkannt

Das Skript speichert einen Fingerabdruck von `keywords.gs` in den Script Properties. Weicht er beim nächsten Lauf ab, meldet das Protokoll die Änderung und weist darauf hin, dass neue Einträge nur für neu eingehende Mails greifen – für den Altbestand ist weiterhin `resetRunTimestamp` nötig, weil der Dauerbetrieb nur den Zeitraum seit dem letzten Lauf durchsucht. Wer das automatisch möchte, setzt die neue Konstante `RESET_ON_KEYWORD_CHANGE` auf `true`; dann führt `labelAll` den Reset beim ersten Lauf nach jeder Änderung selbst aus. Während der Erstbefüllung passiert nichts, dort greifen neue Einträge ohnehin.

### Neu: showKeywords()

Diagnosefunktion, die je Sektion Anzahl und Einträge protokolliert, so wie das Skript sie gelesen hat. Meldet außerdem Sektionsnamen, die das Skript nicht kennt (Tippfehler – ihre Einträge blieben sonst unbemerkt wirkungslos) und leere Pflichtsektionen. Liest keine Mails, vergibt keine Labels.

**Upgrade von 2.18:** Neuen Code einfügen **und** die zweite Datei anlegen – im Editor links neben „Dateien" auf das Plus, **Script** wählen, als Namen `keywords` eingeben, den Beispielinhalt löschen und `keywords.gs` aus dem Paket einfügen. Danach einmal `showKeywords()` ausführen: Meldet es die erwarteten Einträge, ist alles an Ort und Stelle. Ein Reset ist nicht nötig – das Vokabular ist unverändert, die Zuordnung bleibt exakt wie in 2.18. Wer die neuen Absender-Sektionen befüllt, führt danach `resetRunTimestamp` aus; bereits vergebene Labels bleiben dabei bestehen und müssen bei einem gewollten Umzug erst über die passende `removeXxxLabel()`-Funktion entfernt werden.

---

## 2.18 – 2026-08-31

### Keyword-Listen erweitert, keine Regeln geaendert

Alle sieben Keyword-Listen kritisch durchgesehen und um sinnvolle deutsche und englische Begriffe ergaenzt, die in Alias, Absender, Betreff oder Nachrichtentext vorkommen koennen. Reine Vokabular-Erweiterung – Vorrang-Logik, Regelbloecke und Label-Namen sind unveraendert.

- **Einkauf** (`INVOICE_KEYWORDS`): `kassenbon`, `kaufbeleg`, `lieferschein`, Stamm `stornier` (Stornierung/storniert), `widerruf`, `purchase`, `credit note`.
- **Rechnungs-Download** (`DOWNLOAD_KEYWORDS`): `kundenbereich`, `onlinerechnung`, `view your invoice`.
- **Termin** (`EVENT_KEYWORDS`): `veranstaltung`, `besprechung`, `meeting`, `vorstellungsgespraech`/`vorstellungsgespräch`, `interview`, `e-ticket`, `save the date`.
- **Benachrichtigung** (`NOTIFICATION_KEYWORDS`): `benachrichtigung`, `notification` (bewusst breiter Katalogbegriff – das Label heisst selbst so), `sprachnachricht`, `lieferstatus`, `paketstation`, `abholcode`, `parcel`, `in transit`, `package delivered`.
- **Newsletter/Abo** (`SUBSCRIPTION_KEYWORDS`): Stamm `abbestell`, `mailingliste`, `opt-in`, `opt-out`, `mailing list`.
- **Sicherheit** (`SECURITY_KEYWORDS`): `phishing`, `betrugsverdacht`, `kompromittiert`, `kontouebernahme`/`kontoübernahme`, `identitaetsdiebstahl`/`identitätsdiebstahl`, `unbekanntes geraet`/`unbekanntes gerät`, `neues geraet`/`neues gerät`, `wiederherstellungscode`, `compromised`, `unknown device`, `new device`, `identity theft`, `recovery code`, `backup code`, `account locked`, `account takeover`, `multi-factor`.

### Stammform statt Einzelwort bei Erinnerungen

`REMINDER_KEYWORDS` und `EVENT_KEYWORDS` verwenden jetzt den Stamm `erinner` statt `erinnerung`. Deckt per Teilstring zusaetzlich die Verbform ab ("Wir erinnern Sie daran, dass ...", "Nur zur Erinnerung:"), die zuvor durchfiel, weil sie `erinnerung` nicht als Teilstring enthaelt.

**Bekannte, unveraenderte Einschraenkung:** Double-Opt-in-Bestaetigungsmails mit "Please verify your email address" landen weiterhin unter Sicherheit statt Newsletter, weil `SECURITY_KEYWORDS` (`verify your`) in `labelBulkAndShipping()` vor der Abo-Pruefung greift. Kein Vokabular-Problem, sondern eine Frage der Vorrangreihenfolge – hier bewusst nicht angefasst.

**Upgrade:** Nur den neuen Code einfuegen. Reine Vokabular-Erweiterung wie 2.13/2.14 – `resetRunTimestamp` danach ausfuehren, damit bereits durchlaufene Threads mit den neuen Begriffen erneut geprueft werden; `removeAllLabels()` ist nicht noetig.

---

## 2.17 – 2026-08-31

### Label „Warnung" heißt wieder „Sicherheit"

Die Umbenennung aus 2.16 ist zurückgenommen. „Sicherheit" benennt die Kategorie – sicherheitsrelevante Kontopost –, während „Warnung" den Ton einzelner Mails beschreibt und damit schlechter zu dem passt, was tatsächlich im Label liegt: Anmeldecodes, Verifizierungs- und Passwort-Mails sind keine Warnungen. Keywords, Vorrang-Logik und List-Id-Ausnahme sind wie in 2.15 und 2.16 unverändert; im Skript heißen die Bezeichner wieder `SECURITY_LABEL` und `removeSecurityLabel()`.

**Upgrade von 2.16:** Neuen Code einfügen und in Gmail das vorhandene Label **„Warnung" in „Sicherheit" zurückbenennen** (Seitenleiste → Dreipunkt-Menü am Label → Bearbeiten). Die einsortierten Threads bleiben dabei erhalten, ein Reset ist nicht nötig. Wer stattdessen frisch labeln will: `removeLegacyWarningLabel()` ausführen, Label löschen, `resetRunTimestamp`.

**Upgrade von 2.15 oder älter:** Nur den neuen Code einfügen – das Label heißt dort schon „Sicherheit", in Gmail ist nichts zu tun.

---

## 2.16 – 2026-08-30

### Label „Sicherheit" heißt jetzt „Warnung"

Nur eine Umbenennung – Keywords, Vorrang-Logik und List-Id-Ausnahme sind unverändert. Das Singular passt zum Schema der übrigen Labels (Anhang, Termin, Einkauf).

**Upgrade:** Neuen Code einfügen und in Gmail das vorhandene Label **„Sicherheit" in „Warnung" umbenennen** (Seitenleiste → Dreipunkt-Menü am Label → Bearbeiten). Die einsortierten Threads bleiben dabei erhalten, ein Reset ist nicht nötig. Wer stattdessen frisch labeln will: `removeLegacySecurityLabel()` ausführen, Label löschen, `resetRunTimestamp`. Der Aufräumer für das 2.14-Label heißt jetzt `removeLegacyWarningsLabel()`.

---

## 2.15 – 2026-08-30

### Label „Warnungen" in „Sicherheit" aufgegangen

Das in 2.14 eingeführte eigenständige Label „Warnungen" überlappte fast vollständig mit „Sicherheit" – der Kernfall beider Kategorien ist dieselbe Sicherheitswarnung, und zwei Labels für dieselbe Schublade machen die Seitenleiste unübersichtlicher, ohne Information zu gewinnen. `warnung`, `warnmeldung` und `warning` stehen jetzt direkt in `SECURITY_KEYWORDS` (die dadurch redundanten Einzeleinträge `sicherheitswarnung` und `security warning` sind entfallen); der fünfte Regelblock, `WARNING_KEYWORDS` und der Cursor `warning` sind entfernt. Auch fachfremde Warnungen (Unwetterwarnung) landen damit unter Sicherheit – bewusster Kompromiss zugunsten eines einzigen Sammelplatzes.

**Beifang-Hinweis:** Da Sicherheit im ersten Regelblock Vorrang hat und Mails mit bloßem Abmeldelink nicht ausnimmt, zieht `warnung` auch Dringlichkeits-Marketing („Letzte Warnung: Ihr Rabatt verfällt") von Newsletter zu Sicherheit. Die List-Id-Ausnahme fängt echte Verteiler weiterhin ab. Wer den Effekt sieht und nicht mag, streicht `warnung` wieder.

**Upgrade von 2.14:** Neuen Code einfügen, `resetRunTimestamp` ausführen. Falls 2.14 bereits gelaufen ist: einmal `removeWarningLabel()` ausführen (bleibt als Aufräumer im Skript) und danach das leere Label „Warnungen" in Gmail von Hand löschen. Von 2.13 oder älter: nur `resetRunTimestamp`.

---

## 2.14 – 2026-08-30

Neues additives Label **Warnungen** und Telefon-Benachrichtigungen. **`resetRunTimestamp` nach dem Einspielen ausführen** – reine Erweiterungen, `removeAllLabels()` ist nicht nötig. Das neue Label legt das Skript selbst an.

### Neues Label: Warnungen (fünfter Regelblock)

Jede Mail mit `warnung`/`warning` in Betreff oder Absender bekommt das Label Warnungen. Wie die Anhang-Regel ist das ein eigener, unabhängiger Regelblock ohne Vorrang-Logik – das Label ergänzt die übrigen, statt mit ihnen zu konkurrieren. Eine Sicherheitswarnung trägt damit **Sicherheit und Warnungen**, eine Unwetterwarnung nur Warnungen. `SECURITY_KEYWORDS` bleibt unverändert.

Der neue Regelblock hängt an der normalen Fortschritts-Mechanik (eigener Cursor `warning`, Fertig-Marke, `dryRun`, `reportSenders`, `removeWarningLabel()`).

### Anruf-Benachrichtigungen

`NOTIFICATION_KEYWORDS` um `anruf`, `missed call` und `voicemail` erweitert – verpasste Anrufe und Sprachnachrichten (z. B. von sipgate) landen unter Benachrichtigung. `anruf` deckt per Teilstring auch „Anrufliste" und „Anrufaufzeichnung" ab, nicht aber „Rückruf" (anderer Wortstamm).

---

## 2.13 – 2026-08-30

Drei Erweiterungen auf Nutzerwunsch. **`resetRunTimestamp` nach dem Einspielen ausführen** – reine Erweiterungen, `removeAllLabels()` ist nicht nötig.

### Neue Stufe: Erinnerungsmails → Benachrichtigung

Erinnerungsmails ohne jedes Massenversand-Merkmal (z. B. die Terminerinnerung der Arztpraxis ohne ICS-Anhang) bekommen jetzt eine eigene Prüfstufe in `labelBulkAndShipping()`: `REMINDER_KEYWORDS` (`erinnerung`, `reminder`) auf Betreff und Absender, nach der Versandmeldung und vor dem Abo-Vokabular. Diese Stufe wird nur erreicht, wenn kein Massenversand-Header vorliegt – eine werbliche „Reminder"-Kampagne mit Abmeldelink landet weiterhin bei Newsletter/Benachrichtigung, nicht hier.

### Erinnerung + Datum → auch Termin

`erinnerung` und `reminder` zusätzlich in `EVENT_KEYWORDS`. Wie bei allen Stufe-2-Begriffen der Terminregel greift erst die Kombination aus Keyword **und** konkretem Datum im Betreff. Eine Terminerinnerung ohne ICS-Anhang, aber mit Datum im Betreff, bekommt dadurch zwei Labels: Benachrichtigung (neue Stufe oben) und Termin (`labelEvents()`) – die Regelblöcke laufen unabhängig, das ist gewollt.

### Zustellung und Auslieferung → auch Einkauf

`INVOICE_KEYWORDS` um `zustellung` und `auslieferung` erweitert. Eine Zustellmeldung zu einer Bestellung zählt damit zusätzlich als Einkauf, nicht nur als Benachrichtigung – analog zu den Rückgabe-Begriffen aus 2.11. **Achtung, geringe Kollisionsgefahr:** „Zustellung" ist auch ein förmlicher Begriff bei amtlichen und rechtlichen Schreiben („Zustellung eines Bescheids"); solche Mails gelten dann ebenfalls als Einkauf.

---

## 2.12 – 2026-08-30

### `'bestellung'` zum Stamm `'bestell'` erweitert

`'bestellung'` steckte seit 1.7 in `INVOICE_KEYWORDS`, traf aber nur das Substantiv. Eine Mail wie „Vielen Dank, dass Sie bei uns bestellt haben" ohne das Wort „Bestellung" fiel durch – „bestellt" ist kein Teilstring von „bestellung" (die Wörter divergieren nach dem gemeinsamen Stamm „bestell-"). Der Stamm deckt jetzt auch bestellt, bestellen, Besteller und Bestellvorgang ab. Anders als bei den in 2.10/2.11 zurückgenommenen breiten Stämmen (`'anmeld'`) ist hier keine ernsthafte Kollision mit gängigen deutschen Wörtern bekannt.

`resetRunTimestamp` nach dem Einspielen ausführen, damit ältere Mails mit „bestellt"/„bestellen" ohne „Bestellung" im Text nachträglich erfasst werden. `removeAllLabels()` ist **nicht** nötig – die Änderung erweitert nur, sie ändert keine bestehende Zuordnung.

---

## 2.11 – 2026-08-30

Neues Label **Sicherheit**, entschärftes Abo-Vokabular, Rückgaben zählen zum Einkauf. **Nach dem Einspielen `removeAllLabels()` ausführen** (mehrfach, bis alle Zähler 0 melden) – die Zuordnung ändert sich für bereits gelabelte Mails.

### Neues Label: Sicherheit

Kontowarnungen, Anmeldeversuche, Passwort- und Verifizierungsmails bekommen ein eigenes Label. Die Prüfung läuft über Betreff und Absender (`SECURITY_KEYWORDS`) und steht **an erster Stelle** des ersten Regelblocks – vor der Massenmail-, Versand- und Abo-Prüfung. Damit gilt: Eine Kontowarnung ist keine Werbung, auch wenn der Versender pauschal einen Abmeldelink mitschickt.

Threads eines echten Verteilers (List-Id) sind ausgenommen, sonst würde ein Security-Newsletter mit „Security Alert" im Betreff unter Sicherheit landen statt unter Newsletter.

### Abo-Vokabular greift nicht mehr über den blanken Stamm „anmeld"

Der in 2.10 eingeführte Stamm `'anmeld'` traf jede Login- und Sicherheitsmail („Neue Anmeldung in Ihrem Konto") sowie Absender wie `anmeldung@praxis.de` – deren Terminerinnerungen bekamen dadurch zusätzlich das Newsletter-Label. Genau das war der gemeldete Beifang.

**Neu:** „Anmeldung" wirkt nur noch in Kombinationen – `anmeldebestätigung`, `anmeldung bestätigen/bestätigt`, `anmeldung erfolgreich`, `erfolgreich angemeldet`, `ihre/deine/eure anmeldung`. Die Abo-Fälle („Bitte bestätige deine Anmeldung bei uns", „Anmeldebestätigung") werden weiterhin erkannt, Login-Mails nicht mehr. `'abmeld'`, `'abgemeldet'`, `'subscri'`, `'abonn'` und `'newsletter'` bleiben als Stämme, da sie im Mailkontext eindeutig sind. Die Sicherheitsregel ist die zweite Absicherung.

### Rückgaben und Erstattungen zählen zum Einkauf

`INVOICE_KEYWORDS` um `rueckgabe`, `rückgabe`, `ruecksendung`, `rücksendung`, `retoure`, `return`, `refund`, `erstattung` und `gutschrift` erweitert. Zusammen mit der Absender-Prüfung aus 2.10 greifen damit auch Absender wie `ruecksendung@amazon.de` oder `returns@shop.com` ohne Rückgabebegriff im Betreff.

Das Label Benachrichtigung bleibt davon unberührt: Eine Retourenmeldung kann weiterhin beide Labels tragen – sie ist Versandmeldung und Teil des Kaufvorgangs.

### Kleinere Korrekturen

- **`debugHeaders()` wertet Sicherheit als einsortiert.** Sonst hätte das Diagnosewerkzeug Massenmails als „OFFEN" gemeldet, die die Regel korrekt unter Sicherheit abgelegt hat.
- `reportSenders()`, `removeAllLabels()` und der neue Wrapper `removeSecurityLabel()` kennen das sechste Label.

---

## 2.10 – 2026-08-30

Zwei Erweiterungen der Erkennung auf Nutzerwunsch. **Nach dem Einspielen einmal `resetRunTimestamp` ausführen**, damit auch bereits geprüfte Mails nach den neuen Regeln bewertet werden.

### Neue Stufe: Abo-Vokabular in Betreff oder Absender

Willkommens- und Double-Opt-in-Mails („Bitte bestätigen Sie Ihre Newsletter-Anmeldung") werden von Versandsystemen absichtlich als Transaktionsmail **ohne** Massenversand-Header verschickt und fielen bisher durch alle Regeln. Neu: Steht Abo-Vokabular im Betreff oder Absender (Adresse oder Anzeigename), bekommt der Thread das Label Newsletter – auch ganz ohne Header. Die Liste `SUBSCRIPTION_KEYWORDS` arbeitet mit Wortstämmen: `newsletter`, `subscri` (subscribe/subscription/unsubscribed), `abonn` (Abonnement, abonniert), `anmeld`, `angemeldet`, `abmeld`, `abgemeldet`. Bei Massenmails läuft dieselbe Prüfung als neue Stufe 3 in `isNewsletterMessage()` – eine Bulk-Transaktionsmail vom Absender `newsletter@…` wird damit Newsletter statt Benachrichtigung.

Die Versandmeldungs-Prüfung hat Vorrang: „Rücksendung angemeldet" bleibt eine Benachrichtigung.

**Bekannte Kollision:** `anmeld` trifft auch Login- und Sicherheitsmails („Neue Anmeldung in Ihrem Konto") sowie Absender wie `anmeldung@praxis.de` – deren Mails bekommen zusätzlich das Newsletter-Label. Wer das nicht will, streicht `'anmeld'` und `'angemeldet'` aus der Liste.

### Alle Keyword-Regeln prüfen jetzt auch den Absender

Bisher prüfte keine Regel den Absender. Neu läuft jede Keyword-Prüfung über Betreff **und** Absender (`matchesSubjectOrSender()`): Einkauf erkennt damit z. B. `orders@shop.de` und `billing@service.com` auch ohne Rechnungsbegriff im Betreff, die Versandmeldung `tracking@dhl.de`, die Terminregel `buchung@hotel.de` (das geforderte konkrete Datum muss weiterhin in Betreff bzw. Body stehen). Anhangsnamen- und Body-Stufen sind unverändert.

Auch hier steigt der Beifang: `'bill'` trifft jetzt zusätzlich Absender wie `bill.mueller@…`, `'order'` auch `border@…`. Die Hinweise unter „Bekannte Grenzen" der Bedienungsanleitung sind entsprechend erweitert.

---

## 2.9 – 2026-08-30

### Kein Threadverlust nach Rückstand im Dauerbetrieb

Gingen im Dauerbetrieb mehr neue Mails ein, als ein Lauf schafft, arbeitete die betroffene Regel den Rückstand per Cursor rückwärts ab – und sah dabei wegen `before:` keine neu eintreffenden Mails. Nach dem Abarbeiten sprang der Zeitstempel jedoch auf das **Ende** der Aufholphase. Alles, was währenddessen eingegangen war, lag damit für diese Regel außerhalb des nächsten Suchzeitraums; der Ein-Tages-Puffer von `getDateFilter()` fing das nur ab, wenn die Aufholphase binnen eines Tages durch war. Realistisch wurde die Lücke etwa bei Tages-Trigger und großem Rückstand: 1.000 Mails ≈ 7 Läufe ≈ 7 Tage, davon blieben rund 6 Tage Eingang ungeprüft. Es ist dieselbe Fehlerklasse, die 2.8 für die Erstbefüllung behoben hat („Startzeitpunkt als erster Zeitstempel") – dort war der Fix aber nicht auf den Dauerbetrieb übertragen worden.

**Neu:** Bleibt am Ende eines Laufs ein Cursor offen, hält das Skript den Beginn dieses Laufs als Aufhol-Marke fest (`catchupStart` in den Script Properties, nur beim ersten betroffenen Lauf). Ist der Rückstand abgearbeitet, wird diese Marke statt des aktuellen Zeitpunkts zum neuen Zeitstempel. Der Folgelauf prüft die Aufholzeit dadurch ein zweites Mal; bereits gelabelte Threads sind über `-label:` ausgeschlossen, der Doppellauf kostet also kaum etwas. `resetRunTimestamp` löscht die neue Marke mit.

### Kleinere Korrekturen

- **`'einlieferungsbeleg'` aus NOTIFICATION_KEYWORDS entfernt.** `'einlieferung'` trifft den Begriff per Teilstring mit – derselbe Konsolidierungsgedanke wie bei `'sendung'` in 2.1. Das Verhalten ist exakt unverändert, ein `resetRunTimestamp` ist deshalb ausnahmsweise **nicht** nötig.
- **Kommentare bei `LAYOUT_IMAGE_TYPES` und `hasRealAttachment()` korrigiert.** Beide nannten noch den „Abmeldelink" als Massenmail-Kriterium; tatsächlich prüfen sie seit 2.4 gleichrangig List-Unsubscribe, List-Id und Precedence (`isBulkMessage()`).
- **Changelog-Eintrag 2.8:** „Fünf Fehler" zu „Sechs Fehler" korrigiert – der Eintrag listet sechs Hauptkorrekturen vor den kleineren.
- **Neu dokumentiert** (Bedienungsanleitung, „Bekannte Grenzen"): Alte, ungelabelte Threads mit frischer Antwort tauchen während der Erstbefüllung in jedem Batch erneut auf, weil `before:` auf Nachrichtenebene matcht, der Cursor aber mit dem Datum der letzten Nachricht rechnet. Kostet Kontingent, blockiert den Fortschritt aber nicht.

---

## 2.8 – 2026-08-30

Sammelkorrektur nach einem vollständigen Review. Sechs Fehler betrafen die Fortschritts-Mechanik und die Erkennung, der Rest sind Diagnose- und Dokumentationsfixes.

### Erstbefüllung kommt zum Ende (Fertig-Marken)

Bis 2.7 legte jeder volle Batch einen neuen Rückwärts-Cursor an. Da Threads, auf die eine Regel nicht zutrifft, ungelabelt bleiben und deshalb bei jeder Suche wieder oben stehen, begann eine Regel, die das Postfachende erreicht hatte, sofort eine neue Erstbefüllung – sobald sie in einem späteren Lauf wieder einen vollen Batch bekam.

Ob das auffiel, hing davon ab, ob alle Regeln gleichzeitig fertig wurden. Genau das ist im Betrieb nicht der Fall: `labelAttachments()` grenzt seine Suche mit `has:attachment` vor, arbeitet also eine viel dünnere Menge ab und erreicht das Postfachende deutlich früher als die übrigen Regeln. Es startet dann neu, während die anderen noch laufen – und blockiert damit das Setzen des Zeitstempels dauerhaft.

Eine Simulation über 5.000 Threads / 400 Tage zeigt den Unterschied:

| | Zeitstempel gesetzt nach | Thread-Prüfungen | Neustarts |
|---|---|---|---|
| 2.7 | nie (Abbruch nach 400 Läufen) | 295.892 | 110 |
| 2.8 | Lauf 35 | 22.167 | 0 |

*(Simuliert wurde nur die Fortschritts-Mechanik, nicht die Gmail-API. Ohne den `has:attachment`-Effekt – also bei künstlich gleich schnellen Regeln – erreichte auch 2.7 den Dauerbetrieb, nach Lauf 33.)*

**Neu:** Erreicht eine Regel das Postfachende, bekommt sie eine Fertig-Marke in den Script Properties und wird bis zum Abschluss aller Regeln übersprungen. Sind alle vier Regeln fertig, wird der Zeitstempel gesetzt und die Marken werden gelöscht.

### Kein Threadverlust beim Batch-Übergang

Der Cursor stand auf dem Datum der ältesten geprüften Mail. Gmails `before:` ist tagesgenau und exklusiv – die nächste Suche schnitt damit den kompletten Randtag ab, einschließlich der noch nicht geprüften Threads darauf. Das passierte bei *jedem* Batch-Übergang, nicht nur im dokumentierten Sonderfall „mehr als BATCH_SIZE Threads an einem Tag".

**Neu:** Der Cursor steht einen Tag nach der ältesten geprüften Mail. Der Kollisionsschutz bleibt: Liegen tatsächlich mehr als BATCH_SIZE offene Threads auf einem Tag, wird der Tagesrest übersprungen – jetzt aber mit Protokolleintrag statt stillschweigend.

In derselben Simulation: 2.7 verpasste 78 von 1.667 passenden Threads bei der Massenmail-Regel, 2.8 keinen einzigen.

### Trockenlauf verändert keinen Zustand mehr

`advanceWindow()` lief unabhängig von `DRY_RUN`. Ein Trockenlauf schrieb also die Cursor fort. Folgen: Jede Wiederholung zeigte ältere statt derselben Mails, und ein anschließender scharfer Lauf begann mitten im Archiv – alles, was der Trockenlauf überflogen hatte, wurde nie gelabelt.

**Neu:** `advanceWindow()` steigt bei aktivem `DRY_RUN` sofort aus, und `getWindowFilter()` ignoriert im Trockenlauf die Cursor. Der Testlauf ist damit das, was die Doku immer behauptet hat: eine beliebig wiederholbare Stichprobe der neuesten BATCH_SIZE Threads je Regel.

### Massenmail- und Versandregel in einem Durchgang

`labelShippingNotices()` hatte dieselbe Suchquery wie `labelBulkMail()`, aber einen eigenen Cursor. Da die Massenmail-Regel zuerst lief und einen Teil ihrer Treffer weglabelte, griff die zweite Suche zwangsläufig tiefer ins Postfach – sie bewertete also Threads, welche die erste Regel noch nie gesehen hatte. Ein Newsletter mit „Sendung" oder „Tracking" im Betreff bekam dort dauerhaft „Benachrichtigung" statt „Newsletter", weil die Massenmail-Regel ihn später über `-label:Benachrichtigung` ausschloss. Der Abstand zwischen beiden Cursorn wuchs über die gesamte Erstbefüllung.

**Neu:** Beide Prüfungen laufen in `labelBulkAndShipping()` über dieselbe Thread-Liste. Die Semantik ist unverändert – die Versandprüfung greift weiterhin nur bei Threads ohne jede Massenmail-Nachricht –, aber die Reihenfolge gilt jetzt pro Thread statt pro Batch. Nebeneffekt: eine Gmail-Suche weniger pro Lauf.

### Termin-Stufe 2 findet wieder Buchungsbestätigungen

Die keywordbasierte Stufe stand hinter dem Massenmail-Ausschluss. Buchungsportale, Bahn und Fluggesellschaften setzen `List-Unsubscribe` aber pauschal unter jede Mail, auch unter Bestätigungen – die Stufe fand damit genau die Fälle nicht, für die sie gebaut wurde.

**Neu:** Stehen Terminbegriff **und** konkretes Datum im Betreff, greift die Regel auch bei Massenmails. Steht das Datum erst im Fließtext, bleibt der Ausschluss bestehen – dort ist die Kombination zu schwach („Jetzt buchen – nur bis 31.12.2026!").

### `'bereit'` aus DOWNLOAD_KEYWORDS entfernt

Der Vergleich läuft per Teilstring, und „bereit" steckt in **„bereits"**. Stufe 4 der Rechnungserkennung (Keyword im Text plus Download-Hinweis) traf damit auf praktisch jede deutschsprachige Mail zu, in der irgendwo ein Rechnungsbegriff vorkam – „Die Bestellung ist bereits raus" reichte. Betroffen war ausgerechnet die persönliche Post, denn Stufen 3 und 4 laufen erst nach dem Massenmail-Ausschluss.

`'abrufen'` und `'einsehen'` sind aus demselben Grund entfallen, wenn auch weniger dramatisch: Alltagsverben mit geringem Zusatznutzen, weil Anbieter im selben Text fast immer auch „Kundenkonto" oder „herunterladen" schreiben. `'bereitgestellt'` deckt den gemeinten Fall weiterhin ab und war bis 2.7 toter Code, weil `'bereit'` als Präfix immer zuerst traf.

### Kleinere Korrekturen

- **`debugHeaders()` wertet dieselbe Bedingung aus wie die Regel.** Bisher zählte dort jeder gesetzte `Precedence`-Header als Massenmail, in `isBulkMessage()` dagegen nur die Werte `bulk` und `list`. Das Diagnosewerkzeug meldete deshalb Threads als „OFFEN", welche die Regel korrekt liegen ließ. Die Prüfung sitzt jetzt in `hasBulkPrecedence()` und wird von beiden Stellen aufgerufen.
- **`removeLabel()` ist aus dem Editor startbar.** Das Funktions-Dropdown übergibt keine Argumente – der dokumentierte Aufruf `removeLabel(EVENT_LABEL)` lief ins Leere. Neu: fünf parameterlose Wrapper (`removeEventLabel()` usw.).
- **Content-Type-Vergleiche als Präfix.** `application/pdf` und die Bildformate wurden exakt verglichen und schlugen fehl, sobald der Typ Parameter mitführte (`application/pdf; name=…`). Beim ICS-Anhang war das bereits abgefangen.
- **`isInvoiceMessage()` prüft den Betreff vor den Anhängen.** Beide Stufen laufen ohnehin vor dem Massenmail-Ausschluss, die Reihenfolge ist also semantisch gleichwertig – der Betreff liegt aber sofort vor, `getAttachments()` kostet einen API-Aufruf.
- **Zeitstempel im Dauerbetrieb.** Steht nach einem Lauf noch ein Cursor offen (mehr neue Mails als ein Lauf schafft), bleibt der Zeitstempel unverändert. Sonst wäre der Rest aus dem Suchzeitraum gefallen.
- **Startzeitpunkt als erster Zeitstempel.** Während der Erstbefüllung arbeiten die Regeln in Rückwärtsfenstern und sehen neu eingegangene Mails nicht. Der Zeitstempel wird deshalb auf den *Beginn* der Erstbefüllung gesetzt, nicht auf ihr Ende – der erste Vorwärtslauf holt die Lücke damit nach.
- **Dokumentation:** Kopfblock nannte BATCH_SIZE 100, die Konstante stand auf 150; „entfernt alle vier Labels" (es sind fünf); „Beide arbeiten in Blöcken" unter einer Liste mit vier Einträgen. Neu dokumentiert: Zeitzonen-Einstellung des Projekts, `'termin'` trifft „Terminal", `'auftrag'` trifft „beauftragt", `'order'` trifft „reorder".
- Der Kopfblock verweist für die Details jetzt auf `bedienungsanleitung.md`, statt sie zu duplizieren. Die Doppelpflege war die Ursache mehrerer der obigen Abweichungen.

---

## 2.7 – 2026-08-29
Diagnoseausgabe erweitert.

## 2.6 – 2026-08-29
Das Protokoll nennt jetzt je Regel, ob sie bei den neuesten Mails ansetzt oder mit einem Rückwärts-Cursor im Archiv steht. Ohne diese Zeile war nicht erkennbar, dass eine Regel weit hinten im Postfach sucht, obwohl der Suchzeitraum „gesamtes Postfach" meldete.

## 2.5 – 2026-08-29
Diagnosefunktion `debugHeaders()` aufgenommen. Zeigt für eine Stichprobe, welche Massenversand-Header gesetzt sind.

## 2.4 – 2026-08-29
**Fehlerbehebung Massenmail-Erkennung.** Bisher kamen nur Mails mit List-Unsubscribe überhaupt in die Prüfung; List-Id wurde erst danach abgefragt. Verteiler, die List-Id setzen, aber keinen Abmeldelink im Header führen, blieben dadurch unerkannt – in einer Stichprobe betraf das ein Drittel aller Verteiler-Mails. Die drei Merkmale List-Unsubscribe, List-Id und Precedence gelten jetzt gleichrangig. BATCH_SIZE zurück auf 150, weil ein Lauf mit 500 länger dauerte als das Trigger-Intervall und sich selbst blockierte.

## 2.3 – 2026-08-29
BATCH_SIZE von 100 auf 500 erhöht, damit die Erstbefüllung schneller durchläuft.

## 2.2 – 2026-08-29
**Fehlerbehebung Erstbefüllung.** Bisher prüfte jede Regel bei jedem Lauf erneut dieselben neuesten Threads, weil nicht zutreffende Mails ungelabelt bleiben und damit in der Suche stehen. Ältere Mails wurden nie erreicht. Jede Regel führt jetzt einen Rückwärts-Cursor und arbeitet sich Batch für Batch ins Postfach vor; der Zeitstempel wird erst gesetzt, wenn alle Regeln durch sind. Außerdem stand SCRIPT_VERSION fälschlich auf 1.4.

## 2.1 – 2026-08-29
„sendung" als Suchbegriff ergänzt. Deckt per Teilstring auch Sendungsverfolgung, Sendungsnummer und Rücksendung ab; die Einzeleinträge dafür sind entfallen.

## 2.0 – 2026-08-29
Anhang-Regel verfeinert: In Massenmails zählen Bilddateien nicht mehr als Anhang, da Newsletter-Vorlagen Layout-Grafiken teils als regulären Anhang mitsenden. In persönlicher Post bleiben Bilder vollwertige Anhänge.

## 1.9 – 2026-08-29
Rücksendungen ergänzt: „ruecksendung", „rücksendung", „retoure" und „return label" in NOTIFICATION_KEYWORDS.

## 1.8 – 2026-08-29
Zwei Erweiterungen: neues Label **Anhang** für Mails mit angehängter Datei – es ergänzt die übrigen Labels, statt sie zu ersetzen. Außerdem erkennt `labelShippingNotices()` jetzt Versand- und Zustellmeldungen (Einlieferungsbeleg, Sendungsverfolgung) für das Label Benachrichtigung – diese kommen meist ohne Abmeldelink und fielen bisher durch.

## 1.7 – 2026-08-29
Einkauf-Regel erweitert: Suchbegriffe „bestellung", „order" und „auftrag" ergänzt. Anhangsname und Betreff werden jetzt vor dem Newsletter-Ausschluss geprüft – Bestellbestätigungen mit angehängtem Beleg fielen bisher heraus, weil Shops den Abmeldelink pauschal mitsenden.

## 1.6 – 2026-08-29
Label „Werbung" in „Newsletter" umbenannt. Wer eine ältere Version bereits laufen ließ, findet das alte Label weiterhin in Gmail und muss es dort umbenennen oder löschen.

## 1.5 – 2026-08-29
Suchbereich auf den Posteingang eingeschränkt (`in:inbox`). Archiv, Gesendet, Spam und Papierkorb werden nicht mehr durchsucht.

## 1.4 – 2026-08-29
Robustheit und Auswertung: Sperre gegen überlappende Trigger-Läufe (LockService), Fehlerbehandlung je Thread (eine defekte Mail bricht den Batch nicht mehr ab), `reportSenders()` zeigt je Label die häufigsten Absender. Dazu Gesamtzähler im Protokoll, Versionsausgabe im Log und Doku-Korrekturen.

## 1.3 – 2026-08-29
Nur Dokumentation: Kontingente und Berechtigungen ergänzt, Zahlen aus der offiziellen Apps-Script-Quota-Seite (Stand 22.07.2026). Keine Änderung an der Logik.

## 1.2 – 2026-08-29
Trockenlauf über `dryRun()` ergänzt: zeigt im Protokoll, welche Labels vergeben würden, ohne eines zu setzen. Dazu `removeLabel()` und `removeAllLabels()` zum Zurücksetzen.

## 1.1 – 2026-08-29
Terminerkennung um eine zweite Stufe erweitert: Buchungsbegriff im Betreff zusammen mit einem konkreten Datum. Erfasst Bestätigungen von Hotels, Bahn und Arztpraxen, die keine Kalenderdatei mitschicken.

## 1.0 – 2026-08-29
Erste Fassung. Newsletter-Erkennung über den List-Unsubscribe-Header, Rechnungserkennung über Betreff, Anhangsnamen und Body, Terminerkennung über ICS-Anhang. Zeitstempel in den Script Properties, damit Folgeläufe nur neue Mails prüfen.

---

## Hinweis zur Pflege

Bei eigenen Änderungen am Skript die Version im Kopfblock **und** in der Konstante `SCRIPT_VERSION` hochzählen sowie das Datum anpassen. So lässt sich später nachvollziehen, welcher Stand im Apps-Script-Projekt liegt – besonders nützlich, weil nach jeder Änderung an den Keyword-Listen ohnehin `resetRunTimestamp` ausgeführt werden sollte.
