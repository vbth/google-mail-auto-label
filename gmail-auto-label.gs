/**
 * ============================================================================
 * GMAIL AUTO-LABEL
 * ============================================================================
 *
 * Datei:    gmail-auto-label.gs
 * Version:  2.19
 * Stand:    2026-09-01
 * Laufzeit: Google Apps Script (V8)
 *
 * Zweite Datei: keywords.gs - dort stehen alle Suchbegriffe und
 * Absenderadressen, eine Zeile je Eintrag. Ohne sie labelt das Skript nicht.
 *
 * Ausfuehrliche Dokumentation: bedienungsanleitung.md im selben Paket.
 * Dieser Kopfblock deckt nur ab, was man im Apps-Script-Editor braucht.
 *
 * ----------------------------------------------------------------------------
 *
 * Vergibt automatisch Gmail-Labels nach festen, nachvollziehbaren Regeln.
 * Es findet keine inhaltliche Bewertung durch ein KI-Modell statt - jede
 * Entscheidung beruht auf technischen Signalen (Mail-Header, Anhangstypen,
 * Dateinamen) oder auf einfachen Textvergleichen mit den Wortlisten aus
 * keywords.gs.
 *
 * Das Skript laeuft vollstaendig auf Google-Servern im eigenen Konto.
 * Es werden keine Mail-Inhalte an Dritte uebertragen.
 *
 * ----------------------------------------------------------------------------
 * VERGEBENE LABELS
 * ----------------------------------------------------------------------------
 *
 * Sicherheit       Kontowarnungen, Anmeldeversuche, Passwort- und
 *                   Verifizierungsmails sowie alles, was sich per Betreff
 *                   oder Absender selbst als Warnung ausweist. Hat Vorrang
 *                   vor allen anderen Labels des ersten Regelblocks.
 *                   (Hiess nur in 2.16 "Warnung".)
 * Newsletter        Massenmails von echten Verteilern (Newsletter, Kampagnen)
 *                   sowie Abo-Lebenszyklus-Mails (An-/Abmeldung, Willkommens-
 *                   und Double-Opt-in-Mails), erkannt am Abo-Vokabular in
 *                   Betreff oder Absender - auch ohne Massenversand-Header
 * Benachrichtigung  Transaktionsmails mit Abmeldelink (Kontohinweise,
 *                   Statusmeldungen) sowie Versand-, Zustell- und
 *                   Ruecksendemeldungen von Post und Paketdiensten,
 *                   ausserdem transaktionale Erinnerungsmails
 * Einkauf           Rechnungen, Quittungen, Kaufbelege, Bestellbestaetigungen
 * Anhang            Mails mit mindestens einer angehaengten Datei
 *                   (in Massenmails zaehlen Bilder nicht mit)
 * Termin            Kalendereinladungen mit ICS-Anhang sowie
 *                   Buchungsbestaetigungen (Keyword + Datum im Betreff)
 *
 * Nicht erkannte Mails bleiben ungelabelt - das ist beabsichtigt und
 * entspricht faktisch der Kategorie "privat".
 *
 * ----------------------------------------------------------------------------
 * DIE KEYWORD-DATEI
 * ----------------------------------------------------------------------------
 *
 * keywords.gs enthaelt je Kategorie eine Sektion mit Suchbegriffen und eine
 * mit Absenderadressen, eine Zeile je Eintrag - in der Konstante
 * KEYWORDS_TEXT, einem mehrzeiligen Text zwischen Backticks:
 *
 *   [sicherheit]  [newsletter]  [newsletter.body]  [benachrichtigung]
 *   [erinnerung]  [einkauf]  [einkauf.download]  [termin]
 *   [sicherheit.absender]  [newsletter.absender]  [benachrichtigung.absender]
 *   [einkauf.absender]  [termin.absender]
 *
 * Keywords werden per Teilstring in Betreff, Absender und je nach Regel auch
 * in Anhangsnamen oder Text gesucht. Die Absender-Sektionen vergleichen
 * dagegen nur die Absenderadresse, dafuer aber exakt (volle Adresse oder
 * Domain samt Unterdomains) - und ein Treffer dort entscheidet sofort, noch
 * vor jeder Header-Pruefung. Sie sind damit das Werkzeug fuer die Faelle, in
 * denen die Keyword-Regeln danebenliegen. Im Auslieferungszustand sind sie
 * leer.
 *
 * ----------------------------------------------------------------------------
 * BODY-ZUGRIFF
 * ----------------------------------------------------------------------------
 *
 * Drei Regeln lesen den Mail-Text (getPlainBody), aber nur als letzte Stufe,
 * wenn die Header-Pruefung kein Ergebnis liefert:
 *
 *   isNewsletterMessage()  Fallback auf Footer-Formeln
 *   isInvoiceMessage()     Keyword-Suche nach Rechnungsbegriffen
 *   isEventMessage()       Datumssuche, wenn der Betreff keines enthaelt
 *
 * Gesucht wird ausschliesslich im Posteingang (in:inbox). Archiv, Gesendet,
 * Spam und Papierkorb bleiben aussen vor.
 *
 * ----------------------------------------------------------------------------
 * SETUP
 * ----------------------------------------------------------------------------
 *
 * Alles Folgende passiert im Apps-Script-Editor unter script.google.com,
 * nicht in Gmail. In Gmail selbst gibt es keine Menuepunkte fuer das Skript;
 * dort erscheinen nur die vergebenen Labels in der linken Seitenleiste.
 *
 * 1. script.google.com oeffnen -> "Neues Projekt", Projektnamen oben links
 *    in "Gmail Auto-Label" aendern
 * 2. Diesen Code einfuegen und speichern
 * 2b. Zweite Datei anlegen: links neben "Dateien" auf das Plus, "Script"
 *    waehlen, als Namen "keywords" eingeben (die Endung .gs haengt der
 *    Editor an), den Beispielinhalt loeschen und keywords.gs aus dem Paket
 *    einfuegen.
 * 3. WICHTIG: Projekteinstellungen (Zahnrad links) -> Zeitzone auf
 *    "Europe/Berlin" stellen. Neue Projekte stehen oft auf America/New_York,
 *    wodurch die Datumsgrenzen der Suche um einen Tag verrutschen.
 * 4. Labelnamen in den Konstanten unten ggf. anpassen
 * 5. Im Funktions-Dropdown ueber dem Code "dryRun" waehlen und "Ausfuehren"
 *    klicken - vergibt keine Labels, protokolliert nur, was passieren wuerde
 *    -> Google fragt einmalig nach der Gmail-Berechtigung
 * 6. Ausgabe unten im "Ausfuehrungsprotokoll" pruefen. Passt die Zuordnung
 *    nicht, keywords.gs anpassen und dryRun wiederholen
 * 7. Erst dann im selben Dropdown "labelAll" waehlen und ausfuehren
 * 8. Trigger einrichten (Uhr-Symbol links -> "Trigger hinzufuegen"),
 *    Funktion "labelAll", zeitgesteuert
 *
 * Bei einem gewachsenen Postfach braucht die Erstbefuellung viele Durchlaeufe.
 * Dafuer voruebergehend einen Minutentrigger "alle 10 Minuten" anlegen und
 * nach Abschluss durch einen Stunden- oder Tagestrigger ersetzen. Details in
 * der Bedienungsanleitung.
 *
 * ----------------------------------------------------------------------------
 * WIE DAS SKRIPT SEINEN FORTSCHRITT VERWALTET
 * ----------------------------------------------------------------------------
 *
 * Zwei Betriebszustaende, gespeichert in den Script Properties (nicht in
 * Gmail - es entsteht kein Marker-Label):
 *
 * ERSTBEFUELLUNG (solange kein Zeitstempel existiert)
 *   Jede Regel arbeitet sich mit einem eigenen Rueckwaerts-Cursor Batch fuer
 *   Batch ins Postfach vor. Ist eine Regel am Ende angekommen, bekommt sie
 *   eine Fertig-Marke und wird uebersprungen, bis alle Regeln durch sind.
 *   Beim allerersten Lauf wird der Startzeitpunkt festgehalten.
 *
 * DAUERBETRIEB (sobald der Zeitstempel steht)
 *   Geprueft werden nur noch Mails, die seit dem letzten Lauf eingegangen
 *   sind. Als erster Zeitstempel dient der Startzeitpunkt der Erstbefuellung,
 *   damit alles nachgeholt wird, was waehrend der Befuellung ankam.
 *   Faellt eine Regel in Rueckstand (mehr neue Mails, als ein Lauf schafft),
 *   arbeitet sie ihn per Cursor ab; der Zeitstempel rueckt danach auf den
 *   BEGINN dieser Aufholphase vor, damit die waehrenddessen eingegangenen
 *   Mails nicht aus dem Suchzeitraum fallen.
 *
 * ----------------------------------------------------------------------------
 * NACH EINER AENDERUNG AN keywords.gs
 * ----------------------------------------------------------------------------
 *
 * Speichern genuegt - die Datei wird bei jedem Lauf frisch gelesen, ein
 * neuer Eintrag greift also sofort. Er greift aber nur im aktuellen
 * Suchzeitraum, und der ist im Dauerbetrieb nur die Zeit seit dem letzten
 * Lauf: Neu eintreffende Mails werden nach dem neuen Eintrag bewertet,
 * bereits geprueft Aelteres nicht noch einmal.
 *
 * Sollen auch aeltere Mails erneut bewertet werden, einmal
 * "resetRunTimestamp" ausfuehren - danach laeuft wieder eine vollstaendige
 * Erstbefuellung. Sie ist deutlich billiger als die erste, weil alle bereits
 * gelabelten Threads ueber "-label:" aus der Suche fallen; geprueft wird nur
 * noch, was heute ungelabelt ist.
 *
 * Das Skript merkt sich einen Fingerabdruck der Datei und weist im Protokoll
 * darauf hin, sobald sie sich geaendert hat. Wer den Reset lieber automatisch
 * haette, setzt RESET_ON_KEYWORD_CHANGE auf true.
 *
 * Zwei Faelle bleiben Handarbeit: Ein bereits vergebenes Label verschwindet
 * nicht, wenn man das ausloesende Keyword streicht (dafuer die
 * removeXxxLabel-Funktionen), und ein Thread, der schon ein Label des ersten
 * Regelblocks traegt, wird von diesem Block nicht erneut angefasst.
 *
 * ----------------------------------------------------------------------------
 * WENN ETWAS SCHIEFGEHT
 * ----------------------------------------------------------------------------
 *
 * Das Skript vergibt ausschliesslich Labels. Es loescht, archiviert oder
 * verschiebt nichts - im schlimmsten Fall sind Mails falsch einsortiert.
 *
 * showKeywords()       zeigt, was das Skript aus keywords.gs gelesen hat,
 *                      und meldet vertippte Sektionsnamen
 * reportSenders()      zeigt je Label die haeufigsten Absender - das beste
 *                      Werkzeug, um die Zuordnung nachzujustieren, und die
 *                      Vorlage fuer die Absender-Sektionen
 * debugHeaders()       zeigt fuer eine Stichprobe, welche Massenversand-
 *                      Header gesetzt sind
 * removeNewsletterLabel(), removeNotificationLabel(), removeInvoiceLabel(),
 * removeEventLabel(), removeAttachmentLabel(), removeSecurityLabel()
 *                      entfernen ein einzelnes Label von allen Threads
 * removeAllLabels()    entfernt alle sechs Labels und setzt den gespeicherten
 *                      Fortschritt komplett zurueck
 *
 * Die Entfernen-Funktionen arbeiten in Bloecken von BATCH_SIZE und muessen
 * bei vielen Mails mehrfach ausgefuehrt werden, bis der Zaehler 0 meldet.
 * Die Labels selbst bleiben in Gmail bestehen und koennen dort von Hand
 * geloescht werden.
 *
 * ============================================================================
 */


// ============================================================================
// KONFIGURATION
// ============================================================================

// Labelnamen. Werden beim ersten Lauf automatisch angelegt, falls nicht
// vorhanden. Bei nachtraeglicher Aenderung entstehen neue Labels - die alten
// bleiben in Gmail bestehen und muessen dort manuell entfernt werden.
//
// WICHTIG: keine Leerzeichen verwenden. Die Namen landen unmaskiert in
// Gmail-Suchanfragen (-label:Name), und dort beendet ein Leerzeichen den
// Suchbegriff - der Ausschluss bereits gelabelter Threads wuerde brechen.
//
// WICHTIG: Bei jeder Aenderung am Skript zusammen mit "Version:" im
// Kopfblock hochzaehlen - die beiden Stellen laufen sonst auseinander.
const SCRIPT_VERSION = '2.19';

const NEWSLETTER_LABEL = 'Newsletter';
const NOTIFICATION_LABEL = 'Benachrichtigung';
const INVOICE_LABEL = 'Einkauf';
const EVENT_LABEL = 'Termin';
const ATTACHMENT_LABEL = 'Anhang';
// Hiess nur in 2.16 "Warnung", seit 2.17 wieder "Sicherheit" - der Name
// benennt die Kategorie (sicherheitsrelevante Kontopost) statt des Tons
// der Mail. Wer 2.16 eingespielt hatte, benennt das vorhandene Label in
// Gmail einfach zurueck; die einsortierten Threads bleiben dabei
// erhalten, ein Reset ist nicht noetig.
const SECURITY_LABEL = 'Sicherheit';

// Altlasten frueherer Versionen, nur noch fuer die Aufraeumer unten:
// "Warnung" (nur 2.16, falls nicht umbenannt sondern ersetzt) und
// "Warnungen" (nur 2.14). Nach dem Aufraeumen die leeren Labels in Gmail
// von Hand loeschen.
const LEGACY_WARNING_LABEL = 'Warnung';
const LEGACY_WARNINGS_LABEL = 'Warnungen';

// Bildformate, die in Massenmails haeufig als Layout-Grafik mitkommen
// (Kopfzeilen, Buttons, Trennlinien). Sie zaehlen nur dann nicht als
// Anhang, wenn die Mail ein Massenversand-Merkmal traegt (List-Unsubscribe,
// List-Id oder Precedence, siehe isBulkMessage) - in persoenlicher Post
// sind Bilder fast immer echte Fotos und sollen selbstverstaendlich
// gelabelt werden.
const LAYOUT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Anzahl Threads, die eine Regel pro Aufruf verarbeitet.
// Apps Script bricht eine Ausfuehrung nach 6 Minuten ab, deshalb die Grenze.
//
// Richtwert aus der Praxis: rund 100 Threads je Regel brauchen etwa 20-30
// Sekunden. Bei 150 und vier Regeldurchlaeufen liegt ein kompletter
// labelAll-Lauf damit bei gut zwei bis drei Minuten - sicher unter der
// Sechs-Minuten-Grenze und unter einem Zehn-Minuten-Trigger-Intervall.
//
// Nicht deutlich ueber 150 setzen. Mehr Durchlaeufe sind unkritisch, ein
// Timeout kostet dagegen das Fortschreiben des Cursors: Labels werden sofort
// beim Treffer gesetzt und bleiben erhalten, der naechste Lauf nimmt aber
// dasselbe Fenster noch einmal vor.
//
// Wer Timeouts ganz vermeiden will, ruft die Regeln einzeln per eigenem
// Trigger auf (labelBulkAndShipping, labelInvoices, labelEvents,
// labelAttachments) statt gesammelt ueber labelAll. Achtung: Dabei entfaellt
// die automatische Zeitstempel-Verwaltung aus labelAll.
const BATCH_SIZE = 150;

// Alle Wortlisten - Keywords wie Absenderadressen - stehen seit 2.19 in der
// Datei "keywords.gs" neben diesem Skript. Wie sie gelesen und auf die
// Regeln verteilt werden, steht im Abschnitt "KEYWORDS UND ABSENDER" unten.


// Erkennt ein konkretes Datum als Absicherung fuer die Keyword-Treffer.
// Abgedeckt: 15.03.2026, 15.3.26, 2026-03-15 sowie ausgeschriebene
// deutsche und englische Monatsnamen.
const DATE_PATTERN = new RegExp(
  '\\d{1,2}\\.\\s?\\d{1,2}\\.\\s?\\d{2,4}'
  + '|\\d{4}-\\d{2}-\\d{2}'
  + '|\\d{1,2}\\.?\\s?(januar|februar|märz|maerz|april|mai|juni|juli|august'
  + '|september|oktober|november|dezember)'
  + '|(january|february|march|april|may|june|july|august|september|october'
  + '|november|december)\\s?\\d{1,2}'
);

// Trockenlauf-Schalter. Ist er aktiv, wird kein einziges Label vergeben und
// kein gespeicherter Fortschritt veraendert - stattdessen protokolliert das
// Skript nur, was es tun wuerde.
//
// Nicht von Hand aendern: Die Funktion "dryRun" setzt den Schalter selbst
// und stellt ihn danach wieder zurueck.
let DRY_RUN = false;

// Automatischer Reset nach einer Aenderung an keywords.gs.
//
// Standard false: Ein neuer Eintrag wirkt dann nur auf Mails, die ab dem
// naechsten Lauf eingehen - im Dauerbetrieb durchsucht das Skript
// ausschliesslich den Zeitraum seit dem letzten Lauf. Die Aenderung wird
// trotzdem erkannt; das Protokoll weist dann darauf hin, dass ein
// "resetRunTimestamp" faellig waere, um auch den Altbestand neu zu bewerten.
//
// Auf true gesetzt, erledigt labelAll() diesen Reset selbst, sobald sich die
// Datei geaendert hat. Bequem, aber nicht umsonst: Danach laeuft wieder eine
// vollstaendige Erstbefuellung, die bei einem grossen Postfach viele
// Durchlaeufe braucht. Bereits gelabelte Threads sind dabei ueber "-label:"
// ausgeschlossen - erneut geprueft wird also nur, was heute ungelabelt ist.
const RESET_ON_KEYWORD_CHANGE = false;


// ============================================================================
// KEYWORDS UND ABSENDER (Datei keywords.gs)
// ============================================================================
//
// Saemtliches Vokabular steht in der Datei "keywords.gs" im selben
// Apps-Script-Projekt, in der Konstante KEYWORDS_TEXT, eine Zeile je Eintrag.
// Der Kopf jener Datei erklaert Format und Sektionen; hier steht nur, wie
// sie gelesen wird.
//
// WICHTIG ZUR LADEREIHENFOLGE: Apps Script fuehrt bei mehreren .gs-Dateien
// im selben Projekt zuerst den TOP-LEVEL-Code aller Dateien aus (in einer
// Reihenfolge, die nicht dokumentiert und nicht verlaesslich ist), bevor es
// die im Dropdown gewaehlte Funktion aufruft. Wuerde diese Datei
// KEYWORDS_TEXT auf oberster Ebene lesen (z.B. in einer Konstante direkt
// nach dem "const"), koennte das crashen, falls gmail-auto-label.gs vor
// keywords.gs geladen wird - die Konstante existiert dann zwar bereits
// (Deklarationen werden vorab erfasst), ist aber noch nicht initialisiert
// ("temporal dead zone"), und schon ein blosses "typeof" wuerde einen
// ReferenceError werfen statt "undefined" zu liefern.
//
// Deshalb wird KEYWORDS_TEXT NIRGENDS auf oberster Ebene gelesen, sondern
// ausschliesslich innerhalb von loadKeywords() - aufgerufen von
// checkKeywordConfig(), das wiederum immer die erste Aktion von labelAll(),
// dryRun() und showKeywords() ist. Wenn eine dieser Funktionen laeuft, hat
// Apps Script laengst den kompletten Code aller Dateien ausgefuehrt,
// KEYWORDS_TEXT ist dann in jedem Fall entweder initialisiert (Datei
// vorhanden) oder gar nicht deklariert (Datei fehlt) - beides sicher per
// "typeof" unterscheidbar, unabhaengig von der Ladereihenfolge.
//
// Gelesen wird also einmal je Ausfuehrung, beim ersten Aufruf einer der drei
// Funktionen oben, nicht je Mail. Fehlt die Datei, brechen labelAll() und
// dryRun() mit einer Meldung ab; die Aufraeum- und Diagnosefunktionen
// bleiben benutzbar.

/**
 * Sektionen, die das Skript auswertet, und die Konstante, die daraus wird.
 * Steht in der Datei eine Sektion, die hier fehlt, ist das ein Tippfehler -
 * checkKeywordConfig() meldet ihn.
 */
const KEYWORD_SECTIONS = [
  'sicherheit', 'sicherheit.absender',
  'newsletter', 'newsletter.absender', 'newsletter.body',
  'benachrichtigung', 'benachrichtigung.absender', 'erinnerung',
  'einkauf', 'einkauf.absender', 'einkauf.download',
  'termin', 'termin.absender'
];

/**
 * Sektionen, ohne die die zugehoerige Regel praktisch blind waere. Leer
 * heisst nicht kaputt (eine Regel darf abgeschaltet werden), ist aber fast
 * immer ein Versehen - deshalb ein Hinweis im Protokoll.
 *
 * Die Absender-Sektionen stehen bewusst nicht hier: Sie sind ein Zusatz und
 * im Auslieferungszustand leer.
 */
const REQUIRED_SECTIONS = [
  'sicherheit', 'newsletter', 'benachrichtigung', 'einkauf', 'termin'
];

/**
 * Zerlegt den Inhalt von KEYWORDS_TEXT in Sektionen.
 *
 * Format: "[name]" allein auf einer Zeile beginnt eine Sektion, jede weitere
 * Zeile ist ein Eintrag. Leerzeilen und Zeilen, die mit "#" beginnen, werden
 * uebersprungen - ein "#" mitten in der Zeile gehoert dagegen zum Eintrag.
 * Eintraege vor der ersten Ueberschrift gehoeren nirgendwohin und entfallen.
 *
 * Alles wird kleingeschrieben abgelegt, weil saemtliche Vergleiche im Skript
 * in Kleinschreibung laufen. Doppelte Eintraege werden verworfen.
 *
 * @param {string} text  Inhalt von KEYWORDS_TEXT
 * @return {Object}      Sektionsname -> Array der Eintraege
 */
function parseKeywordFile(text) {
  const sections = {};
  let current = null;

  text.split(/\r?\n/).forEach(rawLine => {
    const line = rawLine.trim();
    if (!line || line.charAt(0) === '#') return;

    const header = line.match(/^\[([a-z0-9._-]+)\]$/i);
    if (header) {
      current = header[1].toLowerCase();
      if (!sections[current]) sections[current] = [];
      return;
    }

    if (!current) return;

    const entry = line.toLowerCase();
    if (sections[current].indexOf(entry) < 0) sections[current].push(entry);
  });

  return sections;
}

/**
 * Liest KEYWORDS_TEXT aus keywords.gs und bereitet den Inhalt fuer die
 * Regeln auf.
 *
 * Wirft nie - eine fehlende Datei liefert ein Ergebnis mit ok=false, damit
 * die Aufraeumer und Diagnosefunktionen weiterhin startbar bleiben. Ueber
 * den Fingerabdruck erkennt das Skript spaeter, dass die Datei bearbeitet
 * wurde (siehe noteKeywordChange).
 *
 * Greift bewusst nur auf "typeof KEYWORDS_TEXT" zu, nie auf eine top-level
 * gehaltene Referenz - siehe die Erklaerung zur Ladereihenfolge oben.
 *
 * @return {Object}  {ok, error, sections, unknown, empty, fingerprint}
 */
function readKeywordConfig() {
  if (typeof KEYWORDS_TEXT === 'undefined') {
    return {
      ok: false,
      error: 'Die Datei "keywords.gs" fehlt im Projekt, oder die Konstante '
        + 'KEYWORDS_TEXT darin wurde umbenannt/geloescht.',
      sections: {},
      unknown: [],
      empty: [],
      fingerprint: ''
    };
  }

  const sections = parseKeywordFile(KEYWORDS_TEXT);

  return {
    ok: true,
    error: '',
    sections: sections,
    unknown: Object.keys(sections).filter(n => KEYWORD_SECTIONS.indexOf(n) < 0),
    empty: REQUIRED_SECTIONS.filter(n => !sections[n] || sections[n].length === 0),
    fingerprint: Utilities.base64Encode(Utilities.computeDigest(
      Utilities.DigestAlgorithm.MD5, KEYWORDS_TEXT, Utilities.Charset.UTF_8))
  };
}

/**
 * Eintraege einer Sektion, leeres Array falls es sie nicht gibt.
 *
 * @param {string} name  Sektionsname wie in KEYWORD_SECTIONS
 * @return {string[]}
 */
function keywordSection(name) {
  return KEYWORD_CONFIG.sections[name] || [];
}

// Die eingelesene Konfiguration und die Wortlisten, wie die Regeln sie
// sehen. "let" statt "const" und mit leerem Startwert, weil sie erst beim
// ersten Aufruf von loadKeywords() befuellt werden - nie auf oberster Ebene,
// siehe die Erklaerung zur Ladereihenfolge oben. Jede Liste entspricht genau
// einer Sektion aus keywords.gs; wer wissen will, was sie enthaelt und
// warum, liest die Kommentare dort.
//
// Die Keyword-Listen werden per Teilstring in Betreff, Absender und je nach
// Regel auch in Anhangsnamen oder Nachrichtentext gesucht. Die Absender-
// Listen (*_SENDERS) vergleichen dagegen nur die Absenderadresse, dafuer
// aber exakt - siehe matchesSenderList().
let KEYWORD_CONFIG = null;

let SECURITY_KEYWORDS = [];
let SECURITY_SENDERS = [];

let SUBSCRIPTION_KEYWORDS = [];
let NEWSLETTER_SENDERS = [];
let NEWSLETTER_BODY_MARKERS = [];

let NOTIFICATION_KEYWORDS = [];
let NOTIFICATION_SENDERS = [];
let REMINDER_KEYWORDS = [];

let INVOICE_KEYWORDS = [];
let INVOICE_SENDERS = [];
let DOWNLOAD_KEYWORDS = [];

let EVENT_KEYWORDS = [];
let EVENT_SENDERS = [];

/**
 * Liest keywords.gs ein und befuellt KEYWORD_CONFIG sowie alle Wortlisten
 * oben. Einziger Ort, an dem KEYWORDS_TEXT gelesen wird - siehe die
 * Erklaerung zur Ladereihenfolge oben. Aufgerufen von checkKeywordConfig(),
 * also am Anfang von labelAll(), dryRun() und showKeywords().
 *
 * Mehrfacher Aufruf ist unschaedlich (idempotent), noetig ist er nur einmal
 * je Ausfuehrung.
 */
function loadKeywords() {
  KEYWORD_CONFIG = readKeywordConfig();

  SECURITY_KEYWORDS = keywordSection('sicherheit');
  SECURITY_SENDERS = keywordSection('sicherheit.absender');

  SUBSCRIPTION_KEYWORDS = keywordSection('newsletter');
  NEWSLETTER_SENDERS = keywordSection('newsletter.absender');
  NEWSLETTER_BODY_MARKERS = keywordSection('newsletter.body');

  NOTIFICATION_KEYWORDS = keywordSection('benachrichtigung');
  NOTIFICATION_SENDERS = keywordSection('benachrichtigung.absender');
  REMINDER_KEYWORDS = keywordSection('erinnerung');

  INVOICE_KEYWORDS = keywordSection('einkauf');
  INVOICE_SENDERS = keywordSection('einkauf.absender');
  DOWNLOAD_KEYWORDS = keywordSection('einkauf.download');

  EVENT_KEYWORDS = keywordSection('termin');
  EVENT_SENDERS = keywordSection('termin.absender');
}

/**
 * Laedt keywords.gs (loadKeywords) und protokolliert, was an der
 * eingelesenen Konfiguration auffaellt.
 *
 * @return {boolean}  false = Datei fehlt, der Aufrufer soll abbrechen
 */
function checkKeywordConfig() {
  loadKeywords();

  if (!KEYWORD_CONFIG.ok) {
    Logger.log('ABBRUCH: ' + KEYWORD_CONFIG.error);
    Logger.log('Anlegen: im Editor links neben "Dateien" auf das Plus, '
      + '"Script" waehlen, als Namen "keywords" eingeben und den Inhalt von '
      + 'keywords.gs aus dem Paket einfuegen.');
    return false;
  }

  KEYWORD_CONFIG.unknown.forEach(name => Logger.log(
    'WARNUNG: Sektion "[' + name + ']" kennt das Skript nicht - Tippfehler? '
    + 'Ihre Eintraege bleiben unbenutzt.'));

  KEYWORD_CONFIG.empty.forEach(name => Logger.log(
    'WARNUNG: Sektion "[' + name + ']" ist leer - die zugehoerige Regel greift '
    + 'nur noch ueber ihre technischen Merkmale, falls sie welche hat.'));

  return true;
}



// ============================================================================
// REGEL 1: SICHERHEIT, MASSENMAILS UND VERSANDMELDUNGEN
//          -> "Sicherheit", "Newsletter" oder "Benachrichtigung"
// ============================================================================

/**
 * Sortiert Sicherheitsmails, Massenmails, transaktionale Versandmeldungen,
 * Erinnerungsmails und Abo-Lebenszyklus-Mails ein.
 *
 * Reihenfolge je Thread: Sicherheit -> Absenderlisten -> Massenmail
 * (Newsletter oder Benachrichtigung) -> Versandmeldung -> Erinnerung ->
 * Abo-Vokabular. Der erste Treffer gewinnt, ein Thread bekommt aus diesem
 * Block also genau ein Label.
 *
 * Beides passiert in einem Durchgang ueber dieselbe Thread-Liste, weil die
 * beiden Pruefungen aufeinander aufbauen: Erst entscheidet die Massenmail-
 * Regel, und nur Threads, die dabei leer ausgehen, werden auf Versandmeldung
 * geprueft.
 *
 * Bis Version 2.7 waren das zwei getrennte Funktionen mit je eigener Suche
 * und eigenem Cursor. Da die Massenmail-Regel einen Teil ihrer Treffer
 * weglabelt, griff die zweite Suche zwangslaeufig tiefer ins Postfach - sie
 * bewertete also Threads, welche die erste Regel noch nie gesehen hatte. Ein
 * Newsletter mit "Sendung" im Betreff bekam so dauerhaft "Benachrichtigung"
 * statt "Newsletter". Ein gemeinsamer Durchgang schliesst das aus.
 *
 * Hintergrund zur Massenmail-Erkennung: Seit den Anti-Spam-Vorgaben von
 * Google und Yahoo (2024) setzen auch transaktionale Absender den
 * List-Unsubscribe-Header. Dieser Header allein taugt deshalb nicht mehr zur
 * Newsletter-Erkennung - er markiert nur noch "Massenversand" im weiteren
 * Sinne. Die eigentliche Unterscheidung uebernimmt isNewsletterMessage().
 *
 * @param {string} [dateFilter]  optionaler Gmail-Datumsfilter aus getDateFilter()
 * @return {number}              Anzahl neu gelabelter Threads
 */
function labelBulkAndShipping(dateFilter) {
  const newsletterLabel = getOrCreateLabel(NEWSLETTER_LABEL);
  const notificationLabel = getOrCreateLabel(NOTIFICATION_LABEL);
  const securityLabel = getOrCreateLabel(SECURITY_LABEL);

  // Bereits einsortierte Threads ausschliessen - macht Folgelaeufe schnell
  const query = 'in:inbox -label:' + NEWSLETTER_LABEL + ' -label:' + NOTIFICATION_LABEL
    + ' -label:' + SECURITY_LABEL
    + (dateFilter || '') + getWindowFilter('bulk');
  const threads = GmailApp.search(query, 0, BATCH_SIZE);

  let newsletterCount = 0;
  let notificationCount = 0;
  let shippingCount = 0;
  let subscriptionCount = 0;
  let securityCount = 0;
  let reminderCount = 0;
  let newsletterSenderCount = 0;
  let notificationSenderCount = 0;

  threads.forEach(thread => {
    // Einzelne defekte Mails (z.B. kaputtes Encoding) sollen nicht den
    // ganzen Batch abbrechen - Fehler protokollieren und weitermachen.
    try {
      const messages = thread.getMessages();

      // Sicherheit zuerst: Kontowarnungen, Anmeldeversuche und
      // Verifizierungsmails sind keine Werbung, auch wenn der Versender
      // pauschal einen Abmeldelink mitschickt. Diese Pruefung faengt
      // ausserdem die Login-Mails ab, die sonst ueber das Abo-Vokabular
      // ("Anmeldung") faelschlich als Newsletter gelten wuerden.
      if (messages.some(isSecurityMessage)) {
        applyLabel(thread, securityLabel);
        securityCount++;
        return;
      }

      // Absenderlisten aus keywords.gs, direkt hinter der Sicherheitsregel
      // und noch vor der Massenmail-Pruefung: Wer einen Absender ausdruecklich
      // einer Kategorie zuordnet, will ihn dort sehen - unabhaengig davon,
      // welche Header er setzt. Newsletter vor Benachrichtigung, dieselbe
      // Rangfolge wie in der Massenmail-Regel darunter.
      if (messages.some(msg => matchesSenderList(msg, NEWSLETTER_SENDERS))) {
        applyLabel(thread, newsletterLabel);
        newsletterSenderCount++;
        return;
      }

      if (messages.some(msg => matchesSenderList(msg, NOTIFICATION_SENDERS))) {
        applyLabel(thread, notificationLabel);
        notificationSenderCount++;
        return;
      }

      // Relevant ist jede Nachricht mit einem Massenversand-Merkmal.
      // Ein Thread kann gemischt sein (z.B. Newsletter plus eigene Antwort),
      // deshalb wird gefiltert statt der ganze Thread verworfen.
      const bulkMessages = messages.filter(isBulkMessage);

      if (bulkMessages.length > 0) {
        // Eine Newsletter-Nachricht im Thread genuegt. Im Zweifel landet der
        // Thread also eher bei "Newsletter" als bei "Benachrichtigung".
        if (bulkMessages.some(isNewsletterMessage)) {
          applyLabel(thread, newsletterLabel);
          newsletterCount++;
        } else {
          // Auffangkategorie: Bulk-Mail, aber kein Verteiler-Merkmal
          applyLabel(thread, notificationLabel);
          notificationCount++;
        }
        return;
      }

      // Keine einzige Massenmail im Thread. Jetzt bleibt die Frage, ob es
      // sich um eine transaktionale Versandmeldung handelt - Post- und
      // Paketdienste verschicken Einlieferungsbelege und Sendungsverfolgungen
      // ohne jeden Abmeldelink und fielen sonst durch alle Regeln.
      if (messages.some(isShippingNotice)) {
        applyLabel(thread, notificationLabel);
        shippingCount++;
        return;
      }

      // Erinnerungsmails ohne jedes Massenversand-Merkmal, z.B. eine
      // Terminerinnerung der Arztpraxis ohne ICS-Anhang. Vor der
      // Abo-Pruefung, damit "Erinnerung an Ihre Newsletter-Anmeldung"
      // als Newsletter gilt statt als Benachrichtigung.
      if (messages.some(isReminderMessage)) {
        applyLabel(thread, notificationLabel);
        reminderCount++;
        return;
      }

      // Abo-Lebenszyklus ohne jedes Massenversand-Merkmal: Willkommens-
      // und Double-Opt-in-Mails werden von Versandsystemen absichtlich als
      // Transaktionsmail ohne Verteiler-Header verschickt und fielen bis
      // 2.9 durch. Versandmeldung und Erinnerung haben Vorrang
      // ("Ruecksendung angemeldet" ist eine Benachrichtigung, kein
      // Newsletter).
      if (messages.some(isSubscriptionMessage)) {
        applyLabel(thread, newsletterLabel);
        subscriptionCount++;
      }
    } catch (err) {
      logThreadError(thread, err);
    }
  });

  Logger.log('Geprüfte Threads: ' + threads.length);
  Logger.log('Neu gelabelt als "' + NEWSLETTER_LABEL + '": ' + newsletterCount);
  Logger.log('Neu gelabelt als "' + NOTIFICATION_LABEL + '" (Massenmail): ' + notificationCount);
  Logger.log('Neu gelabelt als "' + NOTIFICATION_LABEL + '" (Versand): ' + shippingCount);
  Logger.log('Neu gelabelt als "' + NOTIFICATION_LABEL + '" (Erinnerung): ' + reminderCount);
  Logger.log('Neu gelabelt als "' + NEWSLETTER_LABEL + '" (Abo-Vokabular): ' + subscriptionCount);
  Logger.log('Neu gelabelt als "' + NEWSLETTER_LABEL + '" (Absenderliste): ' + newsletterSenderCount);
  Logger.log('Neu gelabelt als "' + NOTIFICATION_LABEL + '" (Absenderliste): ' + notificationSenderCount);
  Logger.log('Neu gelabelt als "' + SECURITY_LABEL + '": ' + securityCount);

  advanceWindow('bulk', threads);
  return newsletterCount + notificationCount + shippingCount
    + reminderCount + subscriptionCount + securityCount
    + newsletterSenderCount + notificationSenderCount;
}

/**
 * Erkennt, ob eine Nachricht ueberhaupt Massenversand ist.
 *
 * Geprueft wird auf drei unabhaengige Merkmale, weil sie sich in der Praxis
 * nicht decken: Viele Verteiler setzen List-Id, aber keinen Abmeldelink im
 * Header (der Link steckt dann nur im Text). Wuerde nur List-Unsubscribe
 * abgefragt, blieben genau diese Mails unberuecksichtigt.
 *
 * @param {GmailMessage} msg
 * @return {boolean}
 */
function isBulkMessage(msg) {
  if (hasHeader(msg, 'List-Unsubscribe')) return true;
  if (hasHeader(msg, 'List-Id')) return true;
  return hasBulkPrecedence(msg);
}

/**
 * Prueft den Precedence-Header auf Massenversand-Werte.
 *
 * Eigene Funktion, damit die Diagnose in debugHeaders() garantiert dieselbe
 * Bedingung auswertet wie die Regel. Bis 2.7 zaehlte dort jeder gesetzte
 * Precedence-Header als Massenmail - das Diagnosewerkzeug meldete deshalb
 * Threads als "offen", welche die Regel voellig korrekt liegen liess.
 *
 * Der Fallback auf '' verhindert einen Fehler, wenn der Header fehlt.
 *
 * @param {GmailMessage} msg
 * @return {boolean}
 */
function hasBulkPrecedence(msg) {
  const precedence = (msg.getHeader('Precedence') || '').toLowerCase();
  return precedence.includes('bulk') || precedence.includes('list');
}

/**
 * Entscheidet, ob eine Massenmail ein echter Newsletter ist oder eine
 * transaktionale Nachricht mit Abmeldemoeglichkeit.
 *
 * Setzt voraus, dass isBulkMessage() bereits zugetroffen hat.
 *
 * Die Stufen sind nach Zuverlaessigkeit UND nach Kosten sortiert: Header
 * liegen ohnehin vor, der Body muss dagegen erst geladen werden.
 *
 * @param {GmailMessage} msg  Nachricht mit Massenversand-Merkmal
 * @return {boolean}          true = Newsletter, false = Transaktionsmail
 */
function isNewsletterMessage(msg) {
  // Stufe 1: List-Id kennzeichnet einen Verteiler. Transaktionale
  // Einzelmails setzen diesen Header praktisch nie. Zuverlaessigstes Merkmal.
  if (hasHeader(msg, 'List-Id')) return true;

  // Stufe 2: Precedence: bulk / list markiert Massenversand.
  // Aelterer Standard, aber immer noch verbreitet.
  if (hasBulkPrecedence(msg)) return true;

  // Stufe 3: Abo-Vokabular in Betreff oder Absender. Stuft z.B. eine
  // Bulk-Transaktionsmail vom Absender newsletter@... als Newsletter ein
  // statt als Benachrichtigung. Kostet nichts, laeuft deshalb vor dem
  // Body-Fallback.
  if (isSubscriptionMessage(msg)) return true;

  // Stufe 4: Body-Fallback fuer Versender ohne List-Id.
  // Unschaerfer als die Header-Stufen, weil auch transaktionale Bulk-Mails
  // grosser Anbieter aehnliche Footer verwenden koennen.
  const body = msg.getPlainBody().toLowerCase();
  return containsKeyword(body, NEWSLETTER_BODY_MARKERS);
}

/**
 * Prueft eine Nachricht auf Versand-, Zustell- oder Ruecksendemeldung.
 *
 * Betreff, Absender und Anhang-Dateiname - kein Body-Zugriff: "sendung"
 * oder "paket" tauchen im Fliesstext zu haeufig beilaeufig auf.
 *
 * @param {GmailMessage} msg
 * @return {boolean}
 */
function isShippingNotice(msg) {
  if (matchesSenderList(msg, NOTIFICATION_SENDERS)) return true;
  if (matchesSubjectOrSender(msg, NOTIFICATION_KEYWORDS)) return true;

  return msg.getAttachments({ includeInlineImages: false }).some(att =>
    containsKeyword(att.getName().toLowerCase(), NOTIFICATION_KEYWORDS)
  );
}

/**
 * Prueft Betreff und Absender auf Erinnerungsvokabular (REMINDER_KEYWORDS).
 *
 * Setzt voraus, dass die Nachricht bereits kein Massenversand-Merkmal hat -
 * das entscheidet der Aufrufer in labelBulkAndShipping(). Kein Body-Zugriff.
 *
 * @param {GmailMessage} msg
 * @return {boolean}
 */
function isReminderMessage(msg) {
  return matchesSubjectOrSender(msg, REMINDER_KEYWORDS);
}

/**
 * Prueft Betreff und Absender auf Abo-Vokabular (SUBSCRIPTION_KEYWORDS).
 *
 * @param {GmailMessage} msg
 * @return {boolean}
 */
function isSubscriptionMessage(msg) {
  if (matchesSenderList(msg, NEWSLETTER_SENDERS)) return true;
  return matchesSubjectOrSender(msg, SUBSCRIPTION_KEYWORDS);
}

/**
 * Prueft Betreff und Absender auf Sicherheits- und Kontovokabular.
 *
 * Threads eines echten Verteilers (List-Id) sind ausgenommen: Eine
 * persoenliche Kontowarnung kommt nie ueber eine Mailingliste, ein
 * Security-Newsletter mit "Security Alert" im Betreff dagegen schon.
 *
 * Kein Body-Zugriff.
 *
 * @param {GmailMessage} msg
 * @return {boolean}
 */
function isSecurityMessage(msg) {
  // Ein ausdruecklich eingetragener Absender entscheidet allein - auch gegen
  // die List-Id-Ausnahme darunter. Wer eine Adresse hier hinterlegt, will
  // ihre Post unter Sicherheit sehen, egal wie sie verschickt wird.
  if (matchesSenderList(msg, SECURITY_SENDERS)) return true;

  if (hasHeader(msg, 'List-Id')) return false;
  return matchesSubjectOrSender(msg, SECURITY_KEYWORDS);
}


// ============================================================================
// REGEL 2: RECHNUNGEN -> "Einkauf"
// ============================================================================

/**
 * Sucht Rechnungen, Quittungen und Kaufbelege.
 * Die eigentliche Pruefung steckt in isInvoiceMessage().
 *
 * @param {string} [dateFilter]  optionaler Gmail-Datumsfilter aus getDateFilter()
 * @return {number}              Anzahl neu gelabelter Threads
 */
function labelInvoices(dateFilter) {
  const label = getOrCreateLabel(INVOICE_LABEL);

  // Bewusst ohne "has:attachment" - Rechnungen werden haeufig nur
  // per Link im Kundenkonto bereitgestellt, ohne PDF im Anhang.
  const query = 'in:inbox -label:' + INVOICE_LABEL + (dateFilter || '')
    + getWindowFilter('invoice');
  const threads = GmailApp.search(query, 0, BATCH_SIZE);
  let labeledCount = 0;

  threads.forEach(thread => {
    try {
      // Eine passende Nachricht im Thread genuegt
      if (thread.getMessages().some(isInvoiceMessage)) {
        applyLabel(thread, label);
        labeledCount++;
      }
    } catch (err) {
      logThreadError(thread, err);
    }
  });

  Logger.log('Geprüfte Threads: ' + threads.length);
  Logger.log('Neu gelabelt als "' + INVOICE_LABEL + '": ' + labeledCount);
  advanceWindow('invoice', threads);
  return labeledCount;
}

/**
 * Gestufte Rechnungserkennung.
 *
 * Der Grundgedanke: Ein Rechnungsbegriff im Betreff oder im Anhang-Dateinamen
 * ist aussagekraeftig genug, um allein zu genuegen - diese beiden Stufen
 * laufen deshalb noch vor dem Bulk-Ausschluss. Im Fliesstext taucht
 * "Rechnung" dagegen staendig beilaeufig auf (Footer, Signaturen, Werbung);
 * dort greift der Ausschluss, und der Treffer braucht zusaetzlich einen
 * PDF-Anhang oder einen Download-Hinweis.
 *
 * Die Reihenfolge spart ausserdem Laufzeit: Der Betreff liegt sofort vor,
 * getAttachments() und getPlainBody() werden erst aufgerufen, wenn es
 * noetig ist.
 *
 * @param {GmailMessage} msg
 * @return {boolean}
 */
function isInvoiceMessage(msg) {
  // Stufe 1: Keyword im Betreff oder Absender. "Ihre Rechnung" im Betreff
  // oder ein Absender wie billing@ / rechnung@ meint praktisch immer genau
  // das - stark genug, um den Bulk-Ausschluss weiter unten zu
  // ueberspringen. Kostet nichts, steht deshalb ganz vorn.
  // Stufe 0: Absender steht in [einkauf.absender]. Staerkstes Signal
  // ueberhaupt, weil ausdruecklich eingetragen - vor allem anderen.
  if (matchesSenderList(msg, INVOICE_SENDERS)) return true;

  if (matchesSubjectOrSender(msg, INVOICE_KEYWORDS)) return true;

  // Stufe 2: Keyword im Anhang-Dateinamen, z.B. "rechnung_2026-03.pdf".
  // Ebenfalls sehr stark - eine angehaengte Datei mit Rechnungsnamen
  // verschickt kein Newsletter. Shops setzen List-Unsubscribe oft pauschal
  // auch unter Bestellbestaetigungen mit Beleg im Anhang, deshalb laeuft
  // auch diese Stufe bewusst vor dem Bulk-Ausschluss.
  const attachments = msg.getAttachments();
  const hasKeywordFilename = attachments.some(att =>
    containsKeyword(att.getName().toLowerCase(), INVOICE_KEYWORDS)
  );
  if (hasKeywordFilename) return true;

  // Ab hier nur noch schwache Signale (Keyword irgendwo im Fliesstext).
  // Jetzt greift der Ausschluss: Newsletter und Kampagnenmails erwaehnen
  // "Rechnung" oder "Bestellung" haeufig beilaeufig in Footer und Werbetext.
  if (isBulkMessage(msg)) return false;

  // Ohne Keyword im Text ist die Mail keine Rechnung - frueher Ausstieg,
  // bevor die restlichen Pruefungen folgen.
  const body = msg.getPlainBody().toLowerCase();
  if (!containsKeyword(body, INVOICE_KEYWORDS)) return false;

  // Stufe 3: Keyword im Body plus PDF-Anhang.
  // Die PDF ist die Absicherung gegen zufaellige Worterwaehnungen.
  // indexOf(...) === 0 statt Gleichheit, weil der Content-Type Parameter
  // mitfuehren kann: "application/pdf; name=rechnung.pdf".
  const hasPdf = attachments.some(att =>
    att.getContentType().toLowerCase().indexOf('application/pdf') === 0
  );
  if (hasPdf) return true;

  // Stufe 4: Keyword im Body plus Download-Hinweis.
  // Fuer Rechnungen ohne Anhang, die ins Kundenkonto verlinken.
  return containsKeyword(body, DOWNLOAD_KEYWORDS);
}


// ============================================================================
// REGEL 3: TERMINE -> "Termin"
// ============================================================================

/**
 * Erkennt Termine in zwei Stufen.
 *
 * Stufe 1 ist der ICS-Anhang (Content-Type text/calendar) - ein eindeutiges
 * technisches Signal, das Einladungen aus Google Calendar, Outlook, Teams
 * oder Zoom erfasst. Kein Body-Zugriff noetig.
 *
 * Stufe 2 fasst Buchungsbestaetigungen von Hotels, Bahn, Fluggesellschaften
 * und Arztpraxen, die keine Kalenderdatei mitschicken. Sie arbeitet mit
 * Keywords und ist deshalb deutlich ungenauer als Stufe 1.
 *
 * Hinweis: Auch Absagen und Aktualisierungen tragen einen ICS-Anhang
 * (method=CANCEL bzw. REQUEST) und werden mitgelabelt.
 *
 * @param {string} [dateFilter]  optionaler Gmail-Datumsfilter aus getDateFilter()
 * @return {number}              Anzahl neu gelabelter Threads
 */
function labelEvents(dateFilter) {
  const label = getOrCreateLabel(EVENT_LABEL);

  // Kein "has:attachment" - Stufe 2 findet auch Mails ohne Anhang
  const query = 'in:inbox -label:' + EVENT_LABEL + (dateFilter || '')
    + getWindowFilter('event');
  const threads = GmailApp.search(query, 0, BATCH_SIZE);
  let labeledCount = 0;

  threads.forEach(thread => {
    try {
      if (thread.getMessages().some(isEventMessage)) {
        applyLabel(thread, label);
        labeledCount++;
      }
    } catch (err) {
      logThreadError(thread, err);
    }
  });

  Logger.log('Geprüfte Threads: ' + threads.length);
  Logger.log('Neu gelabelt als "' + EVENT_LABEL + '": ' + labeledCount);
  advanceWindow('event', threads);
  return labeledCount;
}

/**
 * Prueft eine einzelne Nachricht auf Terminmerkmale.
 *
 * @param {GmailMessage} msg
 * @return {boolean}
 */
function isEventMessage(msg) {
  // Stufe 1: ICS-Anhang. Zuverlaessigstes Merkmal, deshalb zuerst - und ohne
  // den Massenmail-Ausschluss, denn auch Verteiler versenden gelegentlich
  // echte Einladungen.
  //
  // Inline-Bilder werden uebersprungen: eingebettete Grafiken sind nie ICS.
  const hasIcs = msg.getAttachments({ includeInlineImages: false }).some(att => {
    const type = att.getContentType().toLowerCase();
    const name = att.getName().toLowerCase();

    // indexOf(...) === 0 statt Gleichheit, weil der Content-Type meist
    // Parameter mitfuehrt: "text/calendar; method=REQUEST; charset=UTF-8"
    // Der Dateiname dient als Fallback fuer Absender, die den Content-Type
    // falsch oder gar nicht setzen.
    return type.indexOf('text/calendar') === 0 || name.endsWith('.ics');
  });
  if (hasIcs) return true;

  // Absender aus [termin.absender]: entscheidet allein, ohne die
  // Datumspruefung von Stufe 2. Deshalb gehoeren dort nur Adressen hinein,
  // die tatsaechlich ausschliesslich Termine verschicken.
  if (matchesSenderList(msg, EVENT_SENDERS)) return true;

  // Ab hier Stufe 2, keywordbasiert. Der Terminbegriff muss im Betreff
  // oder Absender stehen (z.B. buchung@hotel.de). Im Fliesstext wuerden
  // diese Woerter zu haeufig zufaellig treffen. Die Datumspruefung unten
  // laeuft weiterhin nur ueber Betreff bzw. Body.
  const subject = msg.getSubject().toLowerCase();
  if (!matchesSubjectOrSender(msg, EVENT_KEYWORDS)) return false;

  // Keyword UND konkretes Datum im Betreff - stark genug, um auch bei
  // Massenmails zu greifen.
  //
  // Bis 2.7 stand der Bulk-Ausschluss vor dieser Pruefung. Buchungsportale,
  // Bahn und Fluggesellschaften setzen List-Unsubscribe heute aber pauschal
  // unter jede Mail, auch unter Bestaetigungen - Stufe 2 fand damit genau
  // die Faelle nicht, fuer die sie gebaut wurde. Die Kombination aus
  // Terminbegriff und Datum im Betreff ist eng genug, um Werbung
  // ("Jetzt buchen - nur bis 31.12.2026!") weitgehend herauszuhalten.
  if (DATE_PATTERN.test(subject)) return true;

  // Nur ein Keyword im Betreff, das Datum erst im Text: zu schwach fuer
  // Massenmails, denn im Werbetext steht fast immer irgendein Datum.
  if (isBulkMessage(msg)) return false;

  // Absicherung fuer persoenliche Post: irgendwo muss ein konkretes Datum
  // stehen. Ohne Datum ist es eher eine Anfrage oder Erinnerung als eine
  // Bestaetigung.
  return DATE_PATTERN.test(msg.getPlainBody().toLowerCase());
}


// ============================================================================
// REGEL 4: ANHAENGE -> "Anhang"
// ============================================================================

/**
 * Labelt jede Mail, die mindestens eine echte Datei im Anhang hat.
 *
 * Anders als die uebrigen Regeln ist das keine inhaltliche Kategorie,
 * sondern eine reine Eigenschaft der Nachricht - dieses Label ergaenzt die
 * anderen also, statt mit ihnen zu konkurrieren. Eine Rechnung mit PDF
 * traegt am Ende "Einkauf" UND "Anhang", eine Kalendereinladung "Termin"
 * UND "Anhang".
 *
 * Nutzen: In Gmail laesst sich "label:Anhang" mit jedem anderen Label
 * kombinieren, etwa "label:Einkauf label:Anhang" fuer alle Belege, die
 * tatsaechlich eine Datei mitbringen.
 *
 * Inline-Bilder zaehlen bewusst nicht: Signaturlogos und eingebettete
 * Grafiken sind keine Anhaenge im gemeinten Sinn, wuerden aber sonst einen
 * Grossteil aller HTML-Mails einsammeln.
 *
 * Kein Body-Zugriff noetig.
 *
 * @param {string} [dateFilter]  optionaler Gmail-Datumsfilter aus getDateFilter()
 * @return {number}              Anzahl neu gelabelter Threads
 */
function labelAttachments(dateFilter) {
  const label = getOrCreateLabel(ATTACHMENT_LABEL);

  // "has:attachment" grenzt sinnvoll vor - ohne Anhang keine Treffer.
  // Gmail zaehlt dabei auch Inline-Bilder mit, deshalb wird unten noch
  // einmal genauer geprueft.
  const query = 'in:inbox -label:' + ATTACHMENT_LABEL + ' has:attachment'
    + (dateFilter || '') + getWindowFilter('attachment');
  const threads = GmailApp.search(query, 0, BATCH_SIZE);
  let labeledCount = 0;

  threads.forEach(thread => {
    try {
      if (thread.getMessages().some(hasRealAttachment)) {
        applyLabel(thread, label);
        labeledCount++;
      }
    } catch (err) {
      logThreadError(thread, err);
    }
  });

  Logger.log('Geprüfte Threads: ' + threads.length);
  Logger.log('Neu gelabelt als "' + ATTACHMENT_LABEL + '": ' + labeledCount);
  advanceWindow('attachment', threads);
  return labeledCount;
}

/**
 * Prueft, ob eine Nachricht eine Datei enthaelt, die als echter Anhang zaehlt.
 *
 * Inline-Bilder sind ohnehin ausgeschlossen. Zusaetzlich werden bei
 * Massenmails (Massenversand-Merkmal vorhanden, siehe isBulkMessage) auch
 * regulaer angehaengte Bilder ignoriert: Newsletter-Vorlagen liefern Kopfgrafiken und Buttons
 * gelegentlich als normalen Anhang statt inline, was sonst praktisch jede
 * Werbemail zusaetzlich als "Anhang" markieren wuerde.
 *
 * In persoenlicher Post bleiben Bilder dagegen vollwertige Anhaenge - ein
 * zugeschicktes Foto ist genau der Fall, fuer den das Label gedacht ist.
 *
 * @param {GmailMessage} msg
 * @return {boolean}
 */
function hasRealAttachment(msg) {
  const attachments = msg.getAttachments({ includeInlineImages: false });
  if (attachments.length === 0) return false;

  // Persoenliche Post: jeder Anhang zaehlt, auch Bilder
  if (!isBulkMessage(msg)) return true;

  // Massenmail: nur Nicht-Bild-Anhaenge zaehlen (PDF, ICS, ZIP, Office ...).
  // Praefix-Vergleich, weil der Content-Type Parameter mitfuehren kann.
  return attachments.some(att => {
    const type = att.getContentType().toLowerCase();
    return !LAYOUT_IMAGE_TYPES.some(imageType => type.indexOf(imageType) === 0);
  });
}


// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

/**
 * Setzt ein Label auf einen Thread - oder protokolliert es nur,
 * wenn der Trockenlauf aktiv ist.
 *
 * Alle Regeln vergeben Labels ausschliesslich ueber diese Funktion, damit
 * der Trockenlauf zuverlaessig greift.
 *
 * @param {GmailThread} thread
 * @param {GmailLabel} label
 */
function applyLabel(thread, label) {
  if (DRY_RUN) {
    Logger.log('  [Testlauf] ' + label.getName() + ': ' + thread.getFirstMessageSubject());
    return;
  }
  thread.addLabel(label);
}

/**
 * Liefert das Label mit dem angegebenen Namen und legt es an,
 * falls es noch nicht existiert.
 *
 * @param {string} name  Labelname, wie er in Gmail erscheint
 * @return {GmailLabel}
 */
function getOrCreateLabel(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

/**
 * Prueft, ob einer der Suchbegriffe im Text vorkommt.
 *
 * Erwartet, dass Text und Begriffe bereits in Kleinschreibung vorliegen -
 * die Umwandlung passiert an der Aufrufstelle, um sie nicht bei jedem
 * Listeneintrag zu wiederholen.
 *
 * Es wird auf Teilstrings geprueft, nicht auf ganze Woerter. "rechnung"
 * trifft also auch "Rechnungsnummer" - gewollt - aber ebenso "Abrechnung".
 * Bei neuen Eintraegen immer pruefen, in welchen haeufigen Woertern der
 * Begriff sonst noch steckt.
 *
 * @param {string} text
 * @param {string[]} keywords
 * @return {boolean}
 */
function containsKeyword(text, keywords) {
  return keywords.some(kw => text.includes(kw));
}

/**
 * Prueft Betreff UND Absender einer Nachricht auf die Suchbegriffe.
 *
 * getFrom() liefert Anzeigename samt Adresse ("Shop <orders@shop.de>"),
 * erfasst also beides. Kein Body-Zugriff. Seit 2.10 nutzen alle
 * Keyword-Regeln diese Funktion statt einer reinen Betreff-Pruefung.
 *
 * @param {GmailMessage} msg
 * @param {string[]} keywords  Begriffe in Kleinschreibung
 * @return {boolean}
 */
function matchesSubjectOrSender(msg, keywords) {
  if (containsKeyword(msg.getSubject().toLowerCase(), keywords)) return true;
  return containsKeyword(msg.getFrom().toLowerCase(), keywords);
}

/**
 * Liefert die reine Absenderadresse einer Nachricht in Kleinschreibung.
 *
 * getFrom() liefert je nach Versender "Shop" plus Adresse in spitzen Klammern
 * oder nur die nackte Adresse. Fuer die Absenderlisten interessiert nur die
 * Adresse - der Anzeigename ist frei waehlbar und taugt nicht als Kriterium.
 *
 * @param {GmailMessage} msg
 * @return {string}  z.B. "orders@shop.de", leer wenn nicht ermittelbar
 */
function senderAddress(msg) {
  const from = msg.getFrom() || '';
  const start = from.lastIndexOf('<');
  const end = from.lastIndexOf('>');
  const address = (start >= 0 && end > start)
    ? from.substring(start + 1, end)
    : from;

  return address.trim().toLowerCase();
}

/**
 * Prueft die Absenderadresse gegen eine Absenderliste aus keywords.gs.
 *
 * Anders als bei den Keywords wird NICHT per Teilstring verglichen, sonst
 * traefe ein Eintrag "shop.de" auch "shop.de.phishing.example.com". Erlaubt
 * sind drei Schreibweisen:
 *
 *   rechnung@shop.de   genau diese Adresse
 *   @shop.de           die Domain shop.de und alle Unterdomains
 *   shop.de            dasselbe, das fuehrende @ ist optional
 *
 * @param {GmailMessage} msg
 * @param {string[]} entries  Eintraege in Kleinschreibung
 * @return {boolean}
 */
function matchesSenderList(msg, entries) {
  if (entries.length === 0) return false;

  const address = senderAddress(msg);
  if (!address) return false;

  const at = address.lastIndexOf('@');
  const domain = at >= 0 ? address.substring(at + 1) : '';

  return entries.some(entry => {
    // Ein "@" mitten im Eintrag heisst: vollstaendige Adresse
    if (entry.indexOf('@') > 0) return address === entry;

    // Sonst eine Domain, mit oder ohne fuehrendes "@"
    const wanted = entry.charAt(0) === '@' ? entry.substring(1) : entry;
    if (!wanted || !domain) return false;

    return domain === wanted || domain.endsWith('.' + wanted);
  });
}

/**
 * Prueft, ob ein Header gesetzt und nicht leer ist.
 *
 * @param {GmailMessage} msg
 * @param {string} name  Headername, z.B. 'List-Id'
 * @return {boolean}
 */
function hasHeader(msg, name) {
  const value = msg.getHeader(name);
  return Boolean(value) && value.length > 0;
}

/**
 * Protokolliert einen Fehler bei der Verarbeitung eines einzelnen Threads.
 *
 * Wird von den Regelfunktionen genutzt, damit eine einzelne problematische
 * Mail nicht den gesamten Batch abbricht. Der Thread bleibt ungelabelt und
 * wird beim naechsten Lauf erneut versucht.
 *
 * @param {GmailThread} thread
 * @param {Error} err
 */
function logThreadError(thread, err) {
  let subject = '(Betreff nicht lesbar)';
  try {
    subject = thread.getFirstMessageSubject();
  } catch (ignored) {}
  Logger.log('FEHLER bei Thread "' + subject + '": ' + err);
}


// ============================================================================
// FORTSCHRITT (Script Properties)
// ============================================================================

/**
 * Zeitstempel des letzten vollstaendigen Laufs. Existiert er, ist die
 * Erstbefuellung abgeschlossen und das Skript im Dauerbetrieb.
 */
const LAST_RUN_KEY = 'lastRunDate';

/** Beginn der Erstbefuellung, wird ihr spaeterer Zeitstempel. */
const BACKFILL_START_KEY = 'backfillStart';

/**
 * Beginn einer Aufholphase im Dauerbetrieb (mehr neue Mails, als ein Lauf
 * schafft). Solange eine Regel den Rueckstand per Cursor rueckwaerts
 * abarbeitet, schliesst "before:" alle juenger eintreffenden Mails aus.
 * Der Zeitstempel wird nach der Aufholphase deshalb auf ihren BEGINN
 * gesetzt, nicht auf ihr Ende - sonst fielen die waehrenddessen
 * eingegangenen Mails aus dem Suchzeitraum. Der Ein-Tages-Puffer von
 * getDateFilter() faengt das nur bei Aufholphasen unter einem Tag ab.
 * Dieselbe Logik wie BACKFILL_START_KEY fuer die Erstbefuellung.
 */
const CATCHUP_START_KEY = 'catchupStart';

/**
 * Fingerabdruck von keywords.gs beim letzten Lauf. Aendert er sich, wurde
 * die Datei bearbeitet - siehe noteKeywordChange().
 */
const KEYWORDS_FINGERPRINT_KEY = 'keywordsFingerprint';

/** Praefix der Rueckwaerts-Cursor je Regel. */
const CURSOR_PREFIX = 'cursor_';

/** Praefix der Fertig-Marken je Regel (nur waehrend der Erstbefuellung). */
const DONE_PREFIX = 'done_';

/** Alle Regelschluessel. Reihenfolge entspricht der Ausfuehrung. */
const RULE_KEYS = ['bulk', 'invoice', 'event', 'attachment'];

/**
 * Baut den Datumsfilter fuer die Gmail-Suche.
 *
 * Waehrend der Erstbefuellung (kein Zeitstempel) wird kein Filter gesetzt,
 * die Regeln arbeiten das Postfach ueber ihre Cursor ab. Danach werden nur
 * noch Mails geprueft, die seit dem letzten Lauf eingegangen sind.
 *
 * Ein Tag Sicherheitspuffer verhindert, dass Mails durchrutschen, die
 * waehrend eines Laufs oder in einer Zeitzonenverschiebung eintreffen.
 * Gmails after: arbeitet nur tagesgenau, nicht auf die Sekunde.
 *
 * @return {string}  z.B. " after:2026/08/28" oder "" bei der Erstbefuellung
 */
function getDateFilter() {
  const lastRun = PropertiesService.getScriptProperties().getProperty(LAST_RUN_KEY);
  if (!lastRun) return '';

  const date = new Date(lastRun);
  date.setDate(date.getDate() - 1); // Sicherheitspuffer

  return ' after:' + Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy/MM/dd');
}

/**
 * Liefert den Rueckwaerts-Cursor einer Regel als Gmail-Filter.
 *
 * Hintergrund: Threads, auf die eine Regel nicht zutrifft, bleiben ungelabelt
 * und tauchen deshalb bei jedem Lauf erneut in der Suche auf. Ohne Cursor
 * wuerde eine Regel immer wieder dieselben neuesten BATCH_SIZE Threads
 * pruefen und nie tiefer ins Postfach vordringen.
 *
 * Im Trockenlauf wird der Cursor ignoriert: Der Testlauf soll immer eine
 * Stichprobe der neuesten Mails zeigen, nicht die Stelle im Archiv, an der
 * eine laufende Erstbefuellung gerade steht.
 *
 * @param {string} ruleKey  eindeutiger Name der Regel
 * @return {string}         z.B. " before:2026/03/14" oder ""
 */
function getWindowFilter(ruleKey) {
  if (DRY_RUN) return '';

  const cursor = PropertiesService.getScriptProperties()
    .getProperty(CURSOR_PREFIX + ruleKey);

  // Ohne diese Ausgabe waere im Protokoll nicht erkennbar, dass eine Regel
  // gar nicht bei den neuesten Mails sucht, sondern mitten im Archiv steht.
  Logger.log(ruleKey + ': ' + (cursor ? 'rueckwaerts vor ' + cursor : 'ab den neuesten Mails'));

  return cursor ? ' before:' + cursor : '';
}

/**
 * Schreibt den Cursor einer Regel fort.
 *
 * Lieferte die Suche einen vollen Batch, ist das Postfach an dieser Stelle
 * noch nicht erschoepft. Kam weniger als ein voller Batch zurueck, ist die
 * Regel am Ende angelangt: Der Cursor wird geloescht und die Regel waehrend
 * der Erstbefuellung als fertig markiert.
 *
 * Zwei Details, die bis 2.7 falsch waren:
 *
 * 1. Der Cursor steht jetzt einen Tag NACH der aeltesten geprueften Mail.
 *    Gmails "before:" ist tagesgenau und exklusiv - stand der Cursor auf
 *    dem Datum der aeltesten Mail, schnitt die naechste Suche den Rest
 *    dieses Tages ungeprueft ab. Bei jedem Batch-Uebergang gingen so
 *    Threads verloren.
 *
 * 2. Ohne Fertig-Marke legte jeder volle Batch einen neuen Cursor an. Da
 *    ungelabelte Threads bei jeder Suche wieder oben stehen, startete eine
 *    fertige Regel damit sofort eine neue Erstbefuellung - das Skript kam
 *    nie in den Dauerbetrieb und verbrauchte sein Kontingent dauerhaft mit
 *    dem Wiederkaeuen laengst gepruefter Threads.
 *
 * @param {string} ruleKey
 * @param {GmailThread[]} threads  Ergebnis der Suche, neueste zuerst
 */
function advanceWindow(ruleKey, threads) {
  // Der Trockenlauf darf keinerlei Zustand veraendern
  if (DRY_RUN) return;

  const props = PropertiesService.getScriptProperties();
  const key = CURSOR_PREFIX + ruleKey;
  const backfilling = !props.getProperty(LAST_RUN_KEY);

  if (threads.length < BATCH_SIZE) {
    props.deleteProperty(key);
    if (backfilling) props.setProperty(DONE_PREFIX + ruleKey, 'true');
    return;
  }

  // Regel hat ihre Erstbefuellung schon abgeschlossen - keinen neuen
  // Cursor anlegen, sonst beginnt sie von vorn.
  if (backfilling && props.getProperty(DONE_PREFIX + ruleKey)) return;

  const oldest = threads[threads.length - 1].getLastMessageDate();
  const previous = props.getProperty(key);
  const tz = Session.getScriptTimeZone();
  const DAY_MS = 24 * 60 * 60 * 1000;

  let next = Utilities.formatDate(new Date(oldest.getTime() + DAY_MS), tz, 'yyyy/MM/dd');

  // Steht der Cursor bereits dort, liegen mehr als BATCH_SIZE ungelabelte
  // Threads auf diesem einen Tag. Dann bleibt nur, den Tag zu ueberspringen -
  // sonst kaeme die Regel nie weiter.
  if (next === previous) {
    next = Utilities.formatDate(oldest, tz, 'yyyy/MM/dd');
    Logger.log(ruleKey + ': mehr als ' + BATCH_SIZE + ' offene Threads am '
      + next + ' - Rest dieses Tages wird uebersprungen.');
  }

  props.setProperty(key, next);
}

/**
 * Meldet, ob noch mindestens eine Regel mitten in der Erstbefuellung steckt.
 *
 * @return {boolean}
 */
function backfillInProgress() {
  const props = PropertiesService.getScriptProperties();
  return RULE_KEYS.some(k => !props.getProperty(DONE_PREFIX + k));
}

/**
 * Meldet, ob noch ein Cursor offen ist.
 *
 * Im Dauerbetrieb bedeutet das: Es sind mehr neue Mails eingegangen, als ein
 * Lauf schafft. Der Zeitstempel darf dann nicht vorruecken, sonst faellt der
 * Rest aus dem Suchzeitraum.
 *
 * @return {boolean}
 */
function cursorsPending() {
  return PropertiesService.getScriptProperties().getKeys()
    .some(k => k.indexOf(CURSOR_PREFIX) === 0);
}

/**
 * Schliesst die Erstbefuellung ab und schaltet in den Dauerbetrieb.
 *
 * Als Zeitstempel dient der BEGINN der Erstbefuellung, nicht ihr Ende:
 * Waehrend der Befuellung arbeiten die Regeln in Rueckwaerts-Fenstern und
 * sehen neu eingegangene Mails nicht. Mit dem Startdatum als Stichtag holt
 * der erste Vorwaertslauf genau diese Luecke nach - bei einer mehrtaegigen
 * Befuellung koennen das einige Durchlaeufe sein.
 */
function finishBackfill() {
  const props = PropertiesService.getScriptProperties();
  const start = props.getProperty(BACKFILL_START_KEY) || new Date().toISOString();

  props.setProperty(LAST_RUN_KEY, start);
  props.deleteProperty(BACKFILL_START_KEY);
  RULE_KEYS.forEach(k => props.deleteProperty(DONE_PREFIX + k));

  Logger.log('=== Erstbefuellung abgeschlossen ===');
  Logger.log('Stichtag fuer den Dauerbetrieb: ' + start);
  Logger.log('Die naechsten Laeufe holen nach, was seither eingegangen ist.');
  Logger.log('Jetzt den Minutentrigger durch einen Stunden- oder Tagestrigger ersetzen.');
}

/**
 * Speichert den Stand des letzten vollstaendigen Laufs.
 *
 * Normalfall ist der aktuelle Zeitpunkt. Endete gerade eine Aufholphase
 * (es war zuvor ein Cursor offen), zaehlt stattdessen deren Beginn -
 * siehe CATCHUP_START_KEY. Der naechste Lauf prueft die Aufholzeit dann
 * noch einmal mit; bereits gelabelte Threads sind ueber -label:
 * ausgeschlossen, der Doppellauf kostet also kaum etwas.
 */
function saveRunTimestamp() {
  const props = PropertiesService.getScriptProperties();
  const catchupStart = props.getProperty(CATCHUP_START_KEY);

  props.setProperty(LAST_RUN_KEY, catchupStart || new Date().toISOString());
  props.deleteProperty(CATCHUP_START_KEY);
}

/**
 * Erkennt, ob keywords.gs seit dem letzten Lauf bearbeitet wurde, und
 * zieht daraus die Konsequenz.
 *
 * Hintergrund: Die Datei wird bei jedem Lauf frisch gelesen, ein neuer
 * Eintrag greift also sofort - aber nur fuer Mails aus dem aktuellen
 * Suchzeitraum. Im Dauerbetrieb ist das nur noch die Zeit seit dem letzten
 * Lauf; alles Aeltere hat das Skript bereits bewertet und sieht es nicht
 * wieder. Damit ein neues Keyword auch auf den Altbestand angewandt wird,
 * muss der Fortschritt zurueckgesetzt werden.
 *
 * Standardmaessig bleibt das eine Entscheidung des Benutzers und es wird nur
 * darauf hingewiesen; mit RESET_ON_KEYWORD_CHANGE = true erledigt diese
 * Funktion den Reset selbst.
 *
 * Waehrend der Erstbefuellung ist nichts zu tun: Dort arbeiten sich die
 * Regeln ohnehin noch durch das gesamte Postfach.
 */
function noteKeywordChange() {
  const props = PropertiesService.getScriptProperties();
  const stored = props.getProperty(KEYWORDS_FINGERPRINT_KEY);

  if (stored === KEYWORD_CONFIG.fingerprint) return;
  props.setProperty(KEYWORDS_FINGERPRINT_KEY, KEYWORD_CONFIG.fingerprint);

  // Erster Lauf ueberhaupt - es gibt keinen Vorher-Zustand zu vergleichen
  if (!stored) return;

  Logger.log('keywords.gs wurde seit dem letzten Lauf geaendert.');

  if (!props.getProperty(LAST_RUN_KEY)) {
    Logger.log('Die Erstbefuellung laeuft noch - die Aenderung greift '
      + 'automatisch fuer alles, was noch nicht geprueft wurde.');
    return;
  }

  if (RESET_ON_KEYWORD_CHANGE) {
    Logger.log('RESET_ON_KEYWORD_CHANGE ist aktiv - der Fortschritt wird '
      + 'zurueckgesetzt, damit auch aeltere Mails erneut geprueft werden.');
    resetRunTimestamp();
    return;
  }

  Logger.log('Neue Eintraege greifen ab jetzt nur fuer neu eingehende Mails. '
    + 'Sollen auch aeltere Mails danach bewertet werden, einmal '
    + '"resetRunTimestamp" ausfuehren.');
}

/**
 * Loescht den kompletten gespeicherten Fortschritt: Zeitstempel, Cursor,
 * Fertig-Marken und Aufhol-Marke.
 *
 * Danach beginnt der naechste Lauf wieder mit einer vollstaendigen
 * Erstbefuellung. Noetig, wenn die Keyword-Listen geaendert wurden und
 * aeltere Mails nachtraeglich nach den neuen Regeln bewertet werden sollen.
 *
 * Manuell im Editor ausfuehren, nicht im Trigger eintragen.
 */
function resetRunTimestamp() {
  const props = PropertiesService.getScriptProperties();

  props.deleteProperty(LAST_RUN_KEY);
  props.deleteProperty(BACKFILL_START_KEY);
  props.deleteProperty(CATCHUP_START_KEY);

  props.getKeys()
    .filter(k => k.indexOf(CURSOR_PREFIX) === 0 || k.indexOf(DONE_PREFIX) === 0)
    .forEach(k => props.deleteProperty(k));

  Logger.log('Zeitstempel, Cursor, Fertig- und Aufhol-Marken geloescht - '
    + 'der nächste Lauf beginnt von vorn.');
}


// ============================================================================
// EINSTIEGSPUNKT
// ============================================================================

/**
 * Fuehrt alle Regeln nacheinander aus. Diese Funktion im Trigger eintragen.
 *
 * Ein Thread kann mehrere Labels bekommen, etwa "Einkauf", "Termin" und
 * "Anhang" bei einer Buchungsbestaetigung mit Kalenderdatei und Beleg.
 */
function labelAll() {
  // Sperre gegen ueberlappende Laeufe: Dauert ein Lauf laenger als das
  // Trigger-Intervall, wuerde sonst ein zweiter parallel starten. Das
  // Ergebnis waere zwar korrekt (Labels sind idempotent), aber es
  // verschwendet Kontingent und erzeugt verwirrende Doppel-Logs.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    Logger.log('Lauf uebersprungen - ein anderer Lauf ist noch aktiv.');
    return;
  }

  try {
    Logger.log('gmail-auto-label v' + SCRIPT_VERSION);

    // Ohne Wortlisten hat ein Lauf keinen Sinn - lieber abbrechen, als
    // stillschweigend nichts zu finden.
    if (!checkKeywordConfig()) return;

    // Muss vor dem Lesen des Zeitstempels stehen: Bei aktivem
    // RESET_ON_KEYWORD_CHANGE loescht diese Pruefung ihn moeglicherweise,
    // und der Lauf soll dann bereits als Erstbefuellung starten.
    noteKeywordChange();

    const props = PropertiesService.getScriptProperties();
    const backfilling = !props.getProperty(LAST_RUN_KEY);

    // Startzeitpunkt dieses Laufs - wird zum Beginn der Aufholphase,
    // falls unten ein Cursor offen bleibt.
    const runStart = new Date().toISOString();

    if (backfilling && !props.getProperty(BACKFILL_START_KEY)) {
      props.setProperty(BACKFILL_START_KEY, new Date().toISOString());
      Logger.log('Erstbefuellung beginnt. Der Startzeitpunkt ist festgehalten '
        + 'und wird spaeter zum Stichtag des Dauerbetriebs.');
    }

    const dateFilter = getDateFilter();
    Logger.log('Suchzeitraum: ' + (dateFilter || 'gesamtes Postfach (Erstbefuellung)'));

    const total = runRule('bulk', labelBulkAndShipping, dateFilter)
      + runRule('invoice', labelInvoices, dateFilter)
      + runRule('event', labelEvents, dateFilter)
      + runRule('attachment', labelAttachments, dateFilter);

    if (backfilling) {
      if (backfillInProgress()) {
        Logger.log('Erstbefuellung laeuft noch - Zeitstempel wird noch nicht gesetzt.');
      } else {
        finishBackfill();
      }
    } else if (cursorsPending()) {
      // Beginn der Aufholphase festhalten - nur beim ersten betroffenen
      // Lauf, bei laengeren Rueckstaenden bleibt der aelteste Wert stehen.
      // Solange ein Cursor offen ist, sieht die betroffene Regel keine neu
      // eintreffenden Mails; dieser Zeitpunkt wird deshalb spaeter der
      // neue Zeitstempel, damit nichts davon verloren geht.
      if (!props.getProperty(CATCHUP_START_KEY)) {
        props.setProperty(CATCHUP_START_KEY, runStart);
      }
      Logger.log('Es stehen noch Threads aus diesem Zeitraum aus - '
        + 'Zeitstempel bleibt unveraendert.');
    } else {
      saveRunTimestamp();
    }

    Logger.log('=== Gesamt: ' + total + ' Threads neu gelabelt ===');
  } finally {
    lock.releaseLock();
  }
}

/**
 * Ruft eine Regel auf - oder ueberspringt sie, wenn sie ihre Erstbefuellung
 * bereits abgeschlossen hat und noch auf die uebrigen Regeln wartet.
 *
 * Ohne das Ueberspringen wuerde eine fertige Regel bei jedem Lauf erneut die
 * neuesten BATCH_SIZE Threads durchgehen, obwohl sie dort laengst entschieden
 * hat - reine Kontingentverschwendung.
 *
 * @param {string} ruleKey
 * @param {function} ruleFunction
 * @param {string} dateFilter
 * @return {number}  Anzahl neu gelabelter Threads
 */
function runRule(ruleKey, ruleFunction, dateFilter) {
  const done = PropertiesService.getScriptProperties()
    .getProperty(DONE_PREFIX + ruleKey);

  if (done) {
    Logger.log(ruleKey + ': Erstbefuellung dieser Regel ist fertig - '
      + 'uebersprungen, bis alle Regeln durch sind.');
    return 0;
  }

  return ruleFunction(dateFilter);
}


// ============================================================================
// TESTEN UND ZURUECKSETZEN
// ============================================================================

/**
 * Trockenlauf: zeigt im Protokoll, welche Labels vergeben wuerden,
 * ohne tatsaechlich eines zu setzen.
 *
 * Vor dem ersten scharfen Lauf ausfuehren und die Ausgabe pruefen.
 *
 * Der Trockenlauf ignoriert Cursor und Zeitstempel und veraendert sie auch
 * nicht. Er zeigt damit immer dieselbe Stichprobe: die neuesten BATCH_SIZE
 * Threads je Regel. Beliebig oft wiederholbar. Fuer eine breitere Stichprobe
 * BATCH_SIZE voruebergehend erhoehen oder nach dem scharfen Lauf mit
 * reportSenders() nachpruefen.
 *
 * Die leeren Labels legt der Trockenlauf trotzdem an, weil die Regeln sie
 * zu Beginn anfordern. Das ist folgenlos - sie bleiben ohne Inhalt und
 * lassen sich in Gmail jederzeit loeschen.
 *
 * Nicht in einen Trigger eintragen.
 */
function dryRun() {
  DRY_RUN = true;
  try {
    Logger.log('=== TESTLAUF - es werden keine Labels vergeben ===');
    if (!checkKeywordConfig()) return;

    Logger.log('Stichprobe: die neuesten ' + BATCH_SIZE + ' Threads je Regel.');
    Logger.log('Cursor und Zeitstempel werden ignoriert und nicht veraendert.');

    labelBulkAndShipping('');
    labelInvoices('');
    labelEvents('');
    labelAttachments('');

    Logger.log('=== Ende des Testlaufs ===');
  } finally {
    // finally stellt sicher, dass der Schalter auch nach einem Abbruch
    // zurueckgesetzt wird
    DRY_RUN = false;
  }
}

/**
 * Diagnose: zeigt, was das Skript aus keywords.gs gelesen hat.
 *
 * Nach jeder Aenderung an der Datei die schnellste Kontrolle - das Protokoll
 * zeigt je Sektion die Zahl der Eintraege und die Eintraege selbst. Gemeldet
 * werden ausserdem Sektionen, die das Skript nicht kennt (Tippfehler im
 * Namen, ihre Eintraege bleiben wirkungslos) und Pflichtsektionen ohne
 * Inhalt.
 *
 * Liest keine einzige Mail, vergibt keine Labels, veraendert nichts.
 * Nicht in einen Trigger eintragen.
 */
function showKeywords() {
  Logger.log('=== Inhalt von keywords.gs ===');

  if (!checkKeywordConfig()) return;

  let total = 0;

  KEYWORD_SECTIONS.forEach(name => {
    const entries = keywordSection(name);
    total += entries.length;

    Logger.log('[' + name + ']  ' + entries.length + ' Eintraege'
      + (entries.length ? ': ' + entries.join(', ') : ''));
  });

  Logger.log('---');
  Logger.log('Summe: ' + total + ' Eintraege in ' + KEYWORD_SECTIONS.length
    + ' Sektionen.');
}

/**
 * Diagnose: zeigt fuer die neuesten Threads im Posteingang, welche
 * Massenversand-Header tatsaechlich gesetzt sind.
 *
 * Nuetzlich, wenn eine Regel auffallend wenige Treffer meldet. Die Ausgabe
 * zeigt pro Mail drei Flags:
 *
 *   U = List-Unsubscribe    I = List-Id    P = Precedence (bulk/list)
 *
 * Die Flags werten exakt dieselben Bedingungen aus wie isBulkMessage() -
 * was hier als Massenmail gilt, gilt auch fuer die Regel.
 *
 * Liest ausschliesslich Header, Absender und Betreff - keinen Mailtext.
 * Vergibt keine Labels. Nicht in einen Trigger eintragen.
 */
function debugHeaders() {
  const SAMPLE = 40;
  const threads = GmailApp.search('in:inbox', 0, SAMPLE);

  let bulkTotal = 0;
  let bulkLabeled = 0;
  let bulkOpen = 0;

  Logger.log('Stichprobe: ' + threads.length + ' Threads (neueste zuerst)');
  Logger.log('U = List-Unsubscribe, I = List-Id, P = Precedence (bulk/list)');
  Logger.log('OFFEN = Massenmail, die noch nicht einsortiert ist');
  Logger.log('---');

  threads.forEach(thread => {
    try {
      // Erste Nachricht als Vertreter des Threads
      const msg = thread.getMessages()[0];
      const unsub = hasHeader(msg, 'List-Unsubscribe');
      const listId = hasHeader(msg, 'List-Id');
      const prec = hasBulkPrecedence(msg);
      const isBulk = unsub || listId || prec;

      // Traegt der Thread bereits eines der beiden Massenmail-Labels?
      const names = thread.getLabels().map(l => l.getName());
      const alreadyLabeled = names.indexOf(NEWSLETTER_LABEL) !== -1
        || names.indexOf(NOTIFICATION_LABEL) !== -1
        || names.indexOf(SECURITY_LABEL) !== -1;

      if (isBulk) {
        bulkTotal++;
        if (alreadyLabeled) {
          bulkLabeled++;
        } else {
          bulkOpen++;
        }
      }

      const flags = (unsub ? 'U' : '-') + (listId ? 'I' : '-') + (prec ? 'P' : '-');
      const status = isBulk ? (alreadyLabeled ? ' [gelabelt]' : ' [OFFEN]') : '';

      Logger.log(flags + status + '  ' + msg.getFrom().substring(0, 34)
        + '  |  ' + msg.getSubject().substring(0, 40));
    } catch (err) {
      logThreadError(thread, err);
    }
  });

  Logger.log('---');
  Logger.log('Massenmails in der Stichprobe: ' + bulkTotal + ' von ' + threads.length);
  Logger.log('  davon bereits gelabelt:     ' + bulkLabeled);
  Logger.log('  davon noch offen:           ' + bulkOpen);

  if (bulkTotal === 0) {
    Logger.log('WARNUNG: kein einziges Merkmal gefunden - das deutet eher auf ein');
    Logger.log('Problem beim Header-Zugriff hin als auf das Postfach.');
  } else if (bulkOpen === 0) {
    Logger.log('Alle Massenmails der Stichprobe sind einsortiert - dass die Regel');
    Logger.log('hier nichts mehr findet, ist also korrekt.');
  } else {
    Logger.log('Es sind noch Massenmails offen. Findet die Regel sie nicht,');
    Logger.log('liegt es nicht am Postfach, sondern an der Regel.');
  }
}

/**
 * Auswertung zum Nachjustieren: zeigt fuer jedes der sechs Labels die
 * haeufigsten Absender mit Anzahl der Threads.
 *
 * Nach der Erstbefuellung ausfuehren und pruefen, ob die grossen Absender
 * plausibel einsortiert sind. Die Ausgabe ist zugleich die Vorlage fuer die
 * Absender-Sektionen in keywords.gs: Wer hier einen falsch einsortierten
 * Versender sieht, traegt seine Adresse in die Sektion der gewuenschten
 * Kategorie ein (z.B. [newsletter.absender]) und fuehrt danach
 * resetRunTimestamp() aus. Das wirkt sicherer als der Umweg ueber ein
 * zusaetzliches Keyword, das auch andere Absender treffen kann.
 *
 * Achtung: Bereits vergebene Labels verschwinden dadurch nicht von selbst.
 * Ein Thread, der schon unter "Benachrichtigung" liegt, muss dort erst
 * entfernt werden - per Hand oder ueber removeNotificationLabel().
 *
 * Liest nur Absender und Anzahl, keine Inhalte. Betrachtet je Label die
 * juengsten BATCH_SIZE Threads - bei grossen Postfaechern also eine
 * Stichprobe, keine Vollzaehlung.
 */
function reportSenders() {
  const TOP_N = 10;
  const labels = [NEWSLETTER_LABEL, NOTIFICATION_LABEL, INVOICE_LABEL,
                  EVENT_LABEL, ATTACHMENT_LABEL, SECURITY_LABEL];

  labels.forEach(labelName => {
    const label = GmailApp.getUserLabelByName(labelName);
    if (!label) {
      Logger.log(labelName + ': Label existiert noch nicht.');
      return;
    }

    const threads = label.getThreads(0, BATCH_SIZE);
    const counts = {};

    threads.forEach(thread => {
      try {
        // Absender der ersten Nachricht als Vertreter des Threads.
        // Anzeigename und Spitzklammern abstreifen, damit
        // "Shop <mail@shop.de>" und "mail@shop.de" zusammenfallen.
        const raw = thread.getMessages()[0].getFrom();
        const match = raw.match(/<([^>]+)>/);
        const sender = (match ? match[1] : raw).toLowerCase().trim();
        counts[sender] = (counts[sender] || 0) + 1;
      } catch (err) {
        logThreadError(thread, err);
      }
    });

    const top = Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a])
      .slice(0, TOP_N);

    Logger.log('=== ' + labelName + ' (' + threads.length + ' Threads in der Stichprobe) ===');
    top.forEach(sender => Logger.log('  ' + counts[sender] + 'x  ' + sender));
  });
}

/**
 * Entfernt eines der sechs Labels wieder von allen Threads.
 *
 * Das Label selbst bleibt in Gmail bestehen, nur die Zuordnung faellt weg.
 * Die Mails werden nicht veraendert, verschoben oder geloescht.
 *
 * Arbeitet in Bloecken und muss bei vielen betroffenen Mails mehrfach
 * ausgefuehrt werden, bis der Zaehler 0 meldet.
 *
 * Diese Funktion braucht ein Argument und laesst sich deshalb NICHT direkt
 * aus dem Funktions-Dropdown des Editors starten - dafuer gibt es die
 * parameterlosen Wrapper darunter.
 *
 * @param {string} labelName
 */
function removeLabel(labelName) {
  const label = GmailApp.getUserLabelByName(labelName);
  if (!label) {
    Logger.log('Label "' + labelName + '" existiert nicht.');
    return;
  }

  const threads = label.getThreads(0, BATCH_SIZE);
  threads.forEach(thread => thread.removeLabel(label));

  Logger.log('Label "' + labelName + '" von ' + threads.length + ' Threads entfernt.');
  if (threads.length === BATCH_SIZE) {
    Logger.log('Weitere Threads vorhanden - Funktion erneut ausführen.');
  }
}

// Aus dem Funktions-Dropdown direkt startbar.
function removeNewsletterLabel() { removeLabel(NEWSLETTER_LABEL); }
function removeNotificationLabel() { removeLabel(NOTIFICATION_LABEL); }
function removeInvoiceLabel() { removeLabel(INVOICE_LABEL); }
function removeEventLabel() { removeLabel(EVENT_LABEL); }
function removeAttachmentLabel() { removeLabel(ATTACHMENT_LABEL); }
function removeSecurityLabel() { removeLabel(SECURITY_LABEL); }

// Aufraeumer fuer Altlasten (siehe LEGACY_-Konstanten). Einmal ausfuehren,
// danach die leeren Labels in Gmail von Hand loeschen. Nicht noetig, wenn
// das Label "Warnung" beim Upgrade auf 2.17 einfach zurueckbenannt wurde.
function removeLegacyWarningLabel() { removeLabel(LEGACY_WARNING_LABEL); }
function removeLegacyWarningsLabel() { removeLabel(LEGACY_WARNINGS_LABEL); }

/**
 * Setzt das Skript vollstaendig zurueck: entfernt alle sechs Labels von
 * allen Threads und loescht den gespeicherten Fortschritt.
 *
 * Nuetzlich, wenn die Regeln nach dem ersten Lauf nicht passen und man
 * mit geaenderten Keyword-Listen neu anfangen will.
 *
 * Bei einem grossen Postfach mehrfach ausfuehren, bis alle Zaehler 0 melden.
 */
function removeAllLabels() {
  [NEWSLETTER_LABEL, NOTIFICATION_LABEL, INVOICE_LABEL, EVENT_LABEL,
   ATTACHMENT_LABEL, SECURITY_LABEL].forEach(name => removeLabel(name));

  resetRunTimestamp();
}
