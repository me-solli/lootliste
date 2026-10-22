D2R LOOTLISTE – BEREINIGTE HTML-DATEIEN

Inhalt
- Alle 17 bereitgestellten HTML-Seiten, einschließlich der Startseite als index.html.
- Einheitliche UTF-8-Kodierung und LF-Zeilenenden.
- Entfernte nachgestellte Leerzeichen und überzählige Leerzeilen.
- Die bestehende Gestaltung, IDs, CSS-Regeln, Inline-Handler, Skripte,
  API-URLs und Datenlogik wurden bewusst nicht umgebaut.

Prüfung
- JavaScript-Syntax der eingebetteten Skripte mit Node.js geprüft: keine Syntaxfehler.
- Keine doppelten HTML-IDs in den geprüften Dateien gefunden.
- Lokale Verweise geprüft. Ein Teil der referenzierten Dateien fehlt erwartungsgemäß,
  weil nur HTML-Seiten bereitgestellt wurden (z. B. img/..., Favicons und pages/artwork.html).
  Diese Assets sind nicht Bestandteil des ZIP und wurden nicht erfunden oder ersetzt.
- Die Startseite verweist auf pages/artwork.html; diese Seite war nicht unter den
  hochgeladenen HTML-Dateien. Ebenso ist die Admin-/API-Funktionalität ohne Backend
  nicht vollständig testbar.

Wichtig
Dies ist eine vorsichtige Bereinigung, kein Redesign. Die Datei index.html ist die
bereitgestellte Datei index(20261022-123052).html mit bereinigtem Kopfkommentar und
normalisierter Formatierung. Die Originaldateien außerhalb dieses ZIP bleiben unverändert.
