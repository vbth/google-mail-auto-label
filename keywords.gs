/**
 * Wortlisten fuer gmail-auto-label.gs.
 *
 * Der Inhalt dieser Datei ist ein einziger mehrzeiliger Text zwischen zwei
 * Backticks (das Zeichen `), zugewiesen an die Konstante KEYWORDS_TEXT
 * unten. gmail-auto-label.gs liest genau diese Konstante.
 *
 * ACHTUNG bei Aenderungen: Innerhalb der Backticks darf weder ein Backtick
 * noch die Zeichenfolge "${" (Dollarzeichen plus geschweifte Klammer auf)
 * vorkommen - beides hat in einem JavaScript-Template-String eine
 * Sonderbedeutung. Ein einzelnes Vorkommen wuerde das gesamte Skript am
 * Start scheitern lassen (Syntaxfehler im Ausfuehrungsprotokoll, keine
 * einzige Funktion liefe mehr - auch die von gmail-auto-label.gs nicht).
 * In Betreffzeilen, Absenderadressen und Anhangsnamen kommen beide Zeichen
 * praktisch nie vor; falls doch, stattdessen ein anderes Zeichen eintragen
 * (Bindestrich, Anfuehrungszeichen, Doppelpunkt).
 */
const KEYWORDS_TEXT = `
# ============================================================================
# GMAIL AUTO-LABEL - KEYWORDS UND ABSENDER
# ============================================================================
#
# Datei:    keywords.gs
# Gehoert zu: gmail-auto-label.gs ab Version 2.19
#
# Diese Datei enthaelt alle Suchbegriffe und Absenderadressen, nach denen das
# Skript labelt. Sie ist die einzige Stelle, an der Vokabular gepflegt wird -
# im Skript selbst stehen keine Wortlisten mehr.
#
# ----------------------------------------------------------------------------
# WARUM DIESE DATEI EINE .gs-DATEI IST
# ----------------------------------------------------------------------------
#
# keywords.gs ist eine ganz normale Skriptdatei wie gmail-auto-label.gs - im
# Editor mit "Script" anlegen (Plus neben "Dateien"), als Namen "keywords"
# eingeben. Alles ab dieser Zeile bis kurz vor das Dateiende ist reiner Text
# und wird vom Skript genauso gelesen und zerlegt, wie es eine Textdatei
# waere - eine Zeile ein Eintrag, ohne Anfuehrungszeichen und Komma.
#
# WICHTIG, siehe der Kommentar ganz oben in der Datei (vor "const
# KEYWORDS_TEXT"): Zwei Zeichenfolgen duerfen in diesem Textbereich NICHT
# vorkommen, sonst startet das gesamte Skript nicht mehr. In Betreffzeilen,
# Absenderadressen und Anhangsnamen kommen beide praktisch nie vor.
#
# WICHTIG ausserdem: Die Konstante muss exakt "KEYWORDS_TEXT" heissen und
# die Datei exakt "keywords" (Apps Script haengt ".gs" selbst an). Findet
# das Skript die Konstante nicht, labelt es nichts und meldet das im
# Protokoll.
#
# ----------------------------------------------------------------------------
# FORMAT
# ----------------------------------------------------------------------------
#
#   [sektionsname]   beginnt eine Sektion, alleine auf einer Zeile
#   ein Eintrag      pro Zeile genau einer, ohne Anfuehrungszeichen und Komma
#   # Kommentar      ganze Zeile ab dem ersten Zeichen; Leerzeilen egal
#
# Ein "#" mitten in einer Zeile gilt NICHT als Kommentar, sondern gehoert zum
# Eintrag. Fuehrende und abschliessende Leerzeichen werden entfernt.
#
# Alle Eintraege werden in Kleinschreibung verglichen; Grossbuchstaben in
# dieser Datei sind also folgenlos. Verglichen wird per Teilstring: "bestell"
# trifft Bestellung, bestellt, Besteller. Deshalb moeglichst Wortstaemme
# eintragen - und daran denken, dass ein zu kurzer Stamm auch in fremden
# Woertern steckt ("order" auch in "reorder", "border").
#
# Umlaute: Absender schreiben mal "Rueckgabe", mal "Rückgabe". Wo das
# vorkommt, stehen beide Schreibweisen als eigene Zeile untereinander.
#
# ----------------------------------------------------------------------------
# DIE SEKTIONEN
# ----------------------------------------------------------------------------
#
# Keyword-Sektionen (Vergleich mit Betreff, Absender, teils Anhangsname/Text):
#
#   [sicherheit]              -> Label "Sicherheit"
#   [newsletter]              -> Label "Newsletter" (Abo-Vokabular)
#   [newsletter.body]         -> Label "Newsletter" (Footer-Formeln im Text)
#   [benachrichtigung]        -> Label "Benachrichtigung" (Versand/Zustellung)
#   [erinnerung]              -> Label "Benachrichtigung" (Erinnerungsmails)
#   [einkauf]                 -> Label "Einkauf"
#   [einkauf.download]        -> Label "Einkauf" (Rechnung nur verlinkt)
#   [termin]                  -> Label "Termin"
#
# Absender-Sektionen (Vergleich nur mit der Absenderadresse):
#
#   [sicherheit.absender]     [newsletter.absender]
#   [benachrichtigung.absender]                 [einkauf.absender]
#   [termin.absender]
#
# Drei Schreibweisen sind erlaubt:
#
#   rechnung@shop.de     genau diese Adresse
#   @shop.de             die Domain shop.de samt aller Unterdomains
#   shop.de              dasselbe, das fuehrende @ ist optional
#
# KEIN Teilstring-Vergleich, anders als bei den Keywords: "shop.de" trifft
# nicht "mein-shop.de.example.com" und auch keinen Anzeigenamen, sondern nur
# die Domain selbst und Unterdomains wie "mail.shop.de".
#
# Ein Treffer in einer Absender-Sektion ist die staerkste Regel im ganzen
# Skript: Er entscheidet sofort und ueberspringt jede Gegenpruefung. Ein in
# [newsletter.absender] eingetragener Absender wird auch dann Newsletter,
# wenn seine Mails wie Transaktionsmails aussehen; ein Eintrag in
# [sicherheit.absender] gilt selbst dann, wenn die Mail ueber einen echten
# Verteiler (List-Id) kommt. Genau dafuer sind die Listen da - sie sind das
# Werkzeug fuer die Faelle, bei denen die Keyword-Regeln danebenliegen.
#
# Achtung, gilt fuer beide Sorten Sektion: Die Reihenfolge der Labels steht
# im Skript und nicht hier. Sicherheit gewinnt vor Newsletter, Newsletter vor
# Benachrichtigung. Ein Absender in zwei Sektionen bekommt das Label, das in
# dieser Reihenfolge zuerst kommt.
#
# ----------------------------------------------------------------------------
# NACH DEM AENDERN
# ----------------------------------------------------------------------------
#
# Speichern genuegt - der naechste Lauf liest die Datei neu ein. Ein neuer
# Eintrag wirkt aber zunaechst nur auf Mails, die ab dann eingehen: Im
# Dauerbetrieb durchsucht das Skript ausschliesslich den Zeitraum seit dem
# letzten Lauf. Sollen auch aeltere Mails nach dem neuen Eintrag bewertet
# werden, einmal "resetRunTimestamp" ausfuehren.
#
# Das Skript merkt sich einen Fingerabdruck dieser Datei und weist im
# Protokoll darauf hin, sobald sie sich geaendert hat. Wer den Reset lieber
# automatisch haette, setzt im Skript RESET_ON_KEYWORD_CHANGE auf true.
#
# Mit "showKeywords" laesst sich jederzeit pruefen, was das Skript aus dieser
# Datei tatsaechlich gelesen hat - inklusive Warnung bei vertippten
# Sektionsnamen.
#
# ============================================================================


# ============================================================================
# SICHERHEIT
# ============================================================================
#
# Sicherheits- und Kontovokabular. Geprueft werden Betreff und Absender.
#
# Diese Regel laeuft VOR der Massenmail- und der Abo-Pruefung: Eine
# Kontowarnung ist keine Werbung, auch wenn der Versender pauschal einen
# Abmeldelink mitschickt. Threads mit List-Id sind ausgenommen - ein echter
# Verteiler verschickt keine persoenlichen Sicherheitswarnungen, wohl aber
# ein Security-Newsletter mit "Security Alert" im Betreff.
#
# Bewusst enge Begriffe und Wortkombinationen. Einzelwoerter wie "code" oder
# "konto" waeren viel zu breit.
#
# "warnung" deckt per Teilstring auch "sicherheitswarnung" und "warnmeldung"
# ab; ein Einzeleintrag "sicherheitswarnung" waere redundant. Beifang-Hinweis:
# Da Sicherheit Vorrang hat, zieht "warnung" auch Dringlichkeits-Marketing
# ("Letzte Warnung: Ihr Rabatt verfaellt") von Newsletter zu Sicherheit. Wer
# den Effekt sieht und nicht mag, streicht die Zeile.
#
# Bewusst kein Eintrag "mfa" - zu kurz, kollidiert per Teilstring z.B. mit
# "Bootprozess" (englisch "firmware"-Schreibweisen).

[sicherheit]
# Deutsch
warnung
warnmeldung
sicherheitshinweis
sicherheitsbenachrichtigung
sicherheitscode
sicherheitsupdate
anmeldeversuch
anmeldedaten
neue anmeldung
einloggen
passwort
kennwort
verifizieren
verifizierung
bestaetigungscode
bestätigungscode
einmalcode
einmalpasswort
zwei-faktor
zweifaktor
kontowiederherstellung
konto wiederherstellen
wiederherstellungscode
ungewoehnliche aktivitaet
ungewöhnliche aktivität
ungewoehnliche anmeldung
ungewöhnliche anmeldung
datenleck
betrugsverdacht
kompromittiert
kontouebernahme
kontoübernahme
identitaetsdiebstahl
identitätsdiebstahl
unbekanntes geraet
unbekanntes gerät
neues geraet
neues gerät
# Englisch. "warning" deckt "security warning" mit ab.
warning
security alert
security notification
suspicious
unusual activity
unusual sign-in
sign-in
signin attempt
login
password
passcode
verification code
confirmation code
verify your
two-factor
multi-factor
2fa
authenticator
account recovery
account locked
account takeover
recovery code
backup code
data breach
phishing
compromised
unknown device
new device
identity theft

# Absender, deren Post immer unter Sicherheit gehoert - typischerweise die
# Konto- und Login-Adressen der Dienste, bei denen man angemeldet ist.
# Beispiele (auskommentiert, bei Bedarf eigene Adressen ergaenzen):
#
#   no-reply@accounts.google.com
#   @account.microsoft.com
#   sicherheit@meine-bank.de

[sicherheit.absender]


# ============================================================================
# NEWSLETTER
# ============================================================================
#
# Abo-Vokabular fuer Betreff und Absender (Adresse und Anzeigename). Faengt
# den Abo-Lebenszyklus ein, der oft OHNE Massenversand-Header verschickt wird:
# Willkommens- und Double-Opt-in-Mails ("Bitte bestaetigen Sie Ihre
# Anmeldung"), Abmeldebestaetigungen, Absender wie newsletter@example.com.
#
# Teils Wortstaemme, teils Wortkombinationen:
#   subscri    subscribe(d), subscription, unsubscribe(d), subscriber
#   abonn      Abonnement, abonniert, Abonnenten
#   abmeld     Abmeldung, abmelden, Abmeldebestaetigung
#   abbestell  abbestellen, abbestellt, Abbestellung
#   opt-in     deckt per Teilstring auch "double opt-in" ab
#
# "Anmeldung" steht bewusst NUR in Kombinationen. Der blanke Stamm "anmeld"
# traf jede Login- und Sicherheitsmail ("Neue Anmeldung in Ihrem Konto") und
# Absender wie anmeldung@praxis.de, deren Terminerinnerungen dann zusaetzlich
# als Newsletter galten. Die Kombinationen unten treffen die Abo-Faelle und
# lassen Login-Mails aus.

[newsletter]
newsletter
subscri
abonn
abmeld
abgemeldet
abbestell
mailingliste
anmeldebestaetigung
anmeldebestätigung
anmeldung bestaetigen
anmeldung bestätigen
anmeldung bestaetigt
anmeldung bestätigt
anmeldung erfolgreich
erfolgreich angemeldet
ihre anmeldung
deine anmeldung
eure anmeldung
opt-in
opt-out
mailing list

# Absender, deren Post immer Newsletter ist - der schnellste Weg, einen
# hartnaeckigen Versender umzusortieren, der seine Werbung als
# Transaktionsmail verschickt. Beispiele:
#
#   @newsletter.example.com
#   marketing@shop.de

[newsletter.absender]

# Footer-Formeln, wie sie Newsletter-Versandsysteme (Mailchimp, CleverReach,
# Brevo) standardmaessig einsetzen. Dient als Fallback fuer Versender, die
# keinen List-Id-Header setzen - als einzige Sektion dieser Datei wird sie
# im Nachrichtentext gesucht, nicht in Betreff oder Absender.
#
# Erweiterbar: Wenn nach dem ersten Lauf zu viele Newsletter unter
# "Benachrichtigung" landen, deren typische Footer-Zeilen hier ergaenzen.

[newsletter.body]
view this email in your browser
im browser ansehen
diese e-mail im browser
vom newsletter abmelden
newsletter abbestellen
unsubscribe from this list
update your preferences
newsletter-einstellungen


# ============================================================================
# BENACHRICHTIGUNG
# ============================================================================
#
# Begriffe aus Versand- und Zustellbenachrichtigungen (Post, DHL, Hermes,
# Paketdienste). Geprueft werden Betreff, Absender und Anhang-Dateiname, nicht
# der Fliesstext - "sendung" oder "paket" tauchen dort zu haeufig beilaeufig
# auf.
#
# Diese Mails sind transaktional und tragen oft keinen Abmeldelink, fallen also
# nicht unter die Massenmail-Regel. Ein Einlieferungsbeleg kommt zudem haeufig
# als PDF ohne jeden Rechnungsbegriff - ohne diese Liste bliebe er ungelabelt.
#
# "sendung" deckt per Teilstring auch Sendungsverfolgung, Sendungsnummer,
# Ruecksendung und Ruecksendeetikett ab; Einzeleintraege dafuer waeren
# redundant. Aus demselben Grund steht "einlieferung" ohne
# "einlieferungsbeleg". "anruf" deckt "Verpasster Anruf", "Anrufliste",
# "Anrufaufzeichnung" und "Anrufbeantworter" ab - nicht aber "Rueckruf",
# anderer Wortstamm.
#
# "benachrichtigung" und "notification" sind bewusst breite Katalogbegriffe -
# das Label heisst selbst so, und Apps, Banken und Dienste verschicken
# generische "Sie haben eine neue Benachrichtigung"-Mails ohne spezifischeres
# Vokabular. Sie decken per Teilstring bereits "versandbestaetigung" und
# "paketankuendigung" mit ab; die praezisen Einzelbegriffe bleiben trotzdem
# stehen, weil sie zusaetzlich in Anhang-Dateinamen greifen koennen, wo
# "Benachrichtigung" selten vorkommt.
#
# Bewusst NICHT eingetragen: das blanke "package" (zu breit, trifft "software
# package", "package deal") und "delivered" (kollidiert mit den
# Zustellquittungen des E-Mail-Systems selbst, "Your message has been
# delivered").

[benachrichtigung]
sendung
einlieferung
versandbestaetigung
versandbestätigung
zustellung
paketankuendigung
paketankündigung
lieferstatus
paketstation
abholcode
retoure
return label
tracking
shipment
shipping confirmation
out for delivery
parcel
in transit
package delivered
anruf
missed call
voicemail
sprachnachricht
benachrichtigung
notification
postfach
invited

# Absender, deren Post immer Benachrichtigung ist. Typisch sind die
# noreply-Adressen von Paketdiensten und Diensten mit Statusmeldungen:
#
#   noreply@hermes.de
#
# Die Paketdienste stehen hier, weil ihre Sendungsmails sonst als Newsletter
# gelten: Seit den Bulk-Vorgaben von Google und Yahoo (2024) tragen auch reine
# Sendungsverfolgungen einen List-Unsubscribe-Header. Damit greift in
# labelBulkAndShipping() die Massenmail-Regel, und isShippingNotice() - die
# Stufe, welche die Begriffe aus [benachrichtigung] oben auswertet - wird gar
# nicht mehr erreicht. Ein Eintrag hier laeuft noch vor der Massenmail-Regel
# und entscheidet damit unabhaengig von Headern und Footer-Text.

[benachrichtigung.absender]
@dhl.de
@dhl.com
@deutschepost.de

# Erinnerungsmails, eigene Sektion statt Erweiterung von [benachrichtigung],
# damit deren Name (Versand/Zustellung) treffend bleibt. Fuehrt zum selben
# Label.
#
# Geprueft werden Betreff und Absender einer Nachricht OHNE jedes
# Massenversand-Merkmal - eine Erinnerungsmail mit Abmeldelink ist bereits
# durch die Massenmail-Pruefung als Newsletter oder Benachrichtigung
# eingestuft, diese Stufe wird dafuer nie erreicht. Dadurch bleibt der Beifang
# gering: Werbliche "Reminder"-Kampagnen (haben so gut wie immer einen
# Abmeldelink) landen nicht hier.
#
# Der Stamm "erinner" deckt per Teilstring auch die Verbform ab ("Wir erinnern
# Sie daran, dass ...", "Nur zur Erinnerung:").

[erinnerung]
erinner
reminder


# ============================================================================
# EINKAUF
# ============================================================================
#
# Rechnungs- und Bestellbegriffe, deutsch und englisch, geprueft in Betreff,
# Absender, Anhangsnamen und (abgesichert) im Text.
#
# Achtung bei "bill": steckt auch in "Billard", "billig" und im Vornamen
# "Bill". Bei ueberwiegend deutschsprachigem Postfach ggf. entfernen. Ebenso
# trifft "auftrag" per Teilstring auch "beauftragt" und "Auftraggeber",
# "order" auch "reorder" und "border".
#
# "bestell", "order" und "auftrag" erweitern das Label vom reinen Beleg zur
# allgemeinen Einkaufskategorie: Auch Versandbestaetigungen ohne Betrag landen
# dann unter Einkauf. Wer das Label rein als Beleg-Ablage fuer die Buchhaltung
# nutzt, streicht diese drei.
#
# Rueckgabe-Vorgaenge zaehlen ebenfalls zum Einkauf: Sie gehoeren zum
# Kaufvorgang und tragen Betrag und Bestellnummer. Absender wie
# ruecksendung@amazon.de oder returns@shop.com werden ueber die
# Absenderpruefung miterfasst. Das Label Benachrichtigung bleibt davon
# unberuehrt - eine Retourenmeldung kann beides tragen, das ist gewollt.
#
# "zustellung" und "auslieferung" erweitern das Label ueber den eigentlichen
# Kaufbeleg hinaus auf die gesamte Lieferkette einer Bestellung. Achtung,
# geringe Kollisionsgefahr: "Zustellung" ist auch ein foermlicher Begriff bei
# amtlichen Schreiben ("Zustellung eines Bescheids").
#
# "lieferschein" ist ein haeufiger Dateiname bei PDF-Anhaengen und greift
# bereits in der Anhang-Pruefung. "stornier" deckt Stornierung, storniert und
# stornierbar ab, "widerruf" auch widerrufen und Widerrufsrecht.
#
# Bewusst kein eigener Eintrag fuer Stornierungen auf Englisch ("cancel",
# "cancelled order") - "order" deckt "Order cancelled" per Teilstring schon
# ab, und die blanke Form von "cancel" waere als Teilstring viel zu breit
# (traefe "cancel anytime", "cancel your subscription" in Marketing-Mails).

[einkauf]
rechnung
invoice
bill
receipt
quittung
kassenbon
kaufbeleg
lieferschein
bestell
order
auftrag
rueckgabe
rückgabe
ruecksendung
rücksendung
retoure
return
refund
erstattung
gutschrift
stornier
widerruf
purchase
credit note
zustellung
auslieferung
zahlung

# Absender, deren Post immer Einkauf ist - Shops und Rechnungsstellen, die
# ihre Belege ohne erkennbares Vokabular im Betreff verschicken:
#
#   rechnung@telekom.de
#   @amazon.de

[einkauf.absender]

# Formulierungen, die auf eine zum Download bereitgestellte Rechnung
# hindeuten - fuer Anbieter, die keine PDF anhaengen, sondern ins Kundenkonto
# verlinken (Telekom, Stromanbieter, Amazon). Diese Sektion labelt nie
# allein: Sie greift nur zusammen mit einem Treffer aus [einkauf] im Text.
#
# Bewusst nur Begriffe, die in privater Post praktisch nie vorkommen. Fruehere
# Eintraege "bereit", "abrufen" und "einsehen" sind entfallen: "bereit" traf
# per Teilstring auch "bereits" und hat die Absicherung dieser Stufe damit
# vollstaendig ausgehebelt, "abrufen" und "einsehen" sind Alltagsverben mit
# geringem Zusatznutzen. Nur eindeutige Nomen und Wortkombinationen
# aufnehmen, keine blanken Verben ("view").

[einkauf.download]
herunterladen
download
bereitgestellt
kundenkonto
kundenportal
kundenbereich
onlinerechnung
view your invoice


# ============================================================================
# TERMIN
# ============================================================================
#
# Begriffe, die eine Buchungs- oder Terminbestaetigung ankuendigen. Geprueft
# werden Betreff und Absender - im Fliesstext treffen diese Begriffe zu
# haeufig zufaellig.
#
# Bewusst eng gehalten: Breite Woerter wie "bestaetigung" oder "ticket" wuerden
# auch Bestellbestaetigungen und Support-Vorgaenge einsammeln.
#
# Achtung bei "termin": trifft per Teilstring auch "Terminal" (Flughafen-,
# Zahlungsterminal-Mails).
#
# WICHTIG: Ein Keyword aus dieser Sektion labelt nie allein. Es zaehlt erst
# zusammen mit einem konkreten Datum in Betreff oder Text - ein "Reminder"
# ohne Datum reicht nicht. Das Datumsmuster steht im Skript (DATE_PATTERN)
# und laesst sich hier nicht aendern. Kalendereinladungen mit ICS-Anhang
# werden unabhaengig von dieser Liste erkannt.
#
# "erinner" und "reminder" fangen Terminerinnerungen ohne eigenes
# Buchungsvokabular ab ("Erinnerung: morgen ist es soweit - 15.09.2026").

[termin]
buchung
reservierung
reserviert
termin
anreise
check-in
checkin
fahrkarte
bordkarte
boarding
e-ticket
booking
reservation
appointment
itinerary
veranstaltung
besprechung
meeting
vorstellungsgespraech
vorstellungsgespräch
interview
save the date
erinner
reminder

# Absender, deren Post immer Termin ist. Anders als die Keywords oben
# verlangt ein Treffer hier KEIN Datum - der Eintrag entscheidet allein.
# Deshalb nur Adressen eintragen, die wirklich ausschliesslich Termine
# verschicken (Arztpraxis, Buchungsportal), keine allgemeinen Shop-Adressen:
#
#   termine@praxis-mustermann.de
#   @booking.com

[termin.absender]

`;
