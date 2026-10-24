// Construit la version installable de Label Pack Studio (hors ligne, sans serveur) et le panneau Illustrator.
// Usage : cd tools && npm install && npm run build  →  ../dist/LabelPackStudio.zip
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TOOLS, "..");
const DIST = path.join(ROOT, "dist");
const OUT = path.join(DIST, "LabelPackStudio");
const NM = path.join(TOOLS, "node_modules");
const VERSION = JSON.parse(fs.readFileSync(path.join(TOOLS, "package.json"), "utf8")).version || "1.0.0";

const LIBS = [
  ["https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js", "three/build/three.min.js", "three.min.js"],
  ["https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js", "three/examples/js/controls/OrbitControls.js", "OrbitControls.js"],
  ["https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", "jspdf/dist/jspdf.umd.min.js", "jspdf.umd.min.js"],
  ["https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js", "jszip/dist/jszip.min.js", "jszip.min.js"],
];
// Polices utilisées par l'application : [paquet, graisses]
const FONTS = [["archivo", [500, 700, 800]], ["ibm-plex-mono", [400, 500]], ["ibm-plex-sans", [400, 500, 600, 700]],
  ["playfair-display", [700]], ["noto-kufi-arabic", [700]], ["noto-naskh-arabic", [400, 700]]];
const SUBSETS = /-(latin|latin-ext|arabic)-\d+-normal/;

const rm = p => fs.rmSync(p, {recursive:true, force:true});
const mk = p => fs.mkdirSync(p, {recursive:true});
const write = (p, s, mode) => { mk(path.dirname(p)); fs.writeFileSync(p, s); if (mode) fs.chmodSync(p, mode); };
const crlf = s => s.replace(/\r?\n/g, "\r\n");

function buildApp(dir){
  mk(path.join(dir, "lib")); mk(path.join(dir, "fonts"));
  let html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  for (const [url, src, name] of LIBS){
    if (!html.includes(url)) throw new Error("Bibliothèque introuvable dans index.html : " + url);
    html = html.replace(url, "lib/" + name);
    fs.copyFileSync(path.join(NM, src), path.join(dir, "lib", name));
  }
  html = html.replace(/<link rel="preconnect"[^>]*>\n?/g, "").replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/, '<link rel="stylesheet" href="fonts/fonts.css">');
  if (/https?:\/\/(cdn|fonts)\./.test(html.replace(/https:\/\/claude\.ai[^"'`\s]*/g, ""))) throw new Error("Une ressource externe subsiste dans la page.");
  let css = "";
  for (const [pkg, weights] of FONTS) for (const w of weights){
    const src = fs.readFileSync(path.join(NM, "@fontsource", pkg, `${w}.css`), "utf8");
    for (const block of src.split(/(?=\/\*)/)){
      const m = /\/\* ([^*]+) \*\//.exec(block); if (!m || !SUBSETS.test(m[1])) continue;
      const files = [...block.matchAll(/url\(\.\/files\/([^)]+)\)/g)].map(x => x[1]);
      for (const f of files) fs.copyFileSync(path.join(NM, "@fontsource", pkg, "files", f), path.join(dir, "fonts", f));
      css += block.replace(/url\(\.\/files\//g, "url(./").trim() + "\n\n";
    }
  }
  write(path.join(dir, "fonts", "fonts.css"), css);
  const page = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="application-name" content="Label Pack Studio">
<link rel="icon" href="lib/icone.png">
</head>
<body>
${html}
</body>
</html>
`;
  fs.copyFileSync(path.join(TOOLS, "icone.png"), path.join(dir, "lib", "icone.png"));
  return page;
}

rm(OUT); rm(path.join(DIST, "LabelPackStudio.zip")); mk(OUT);

// 1) Application de bureau (navigateur en mode application, aucune installation de serveur)
write(path.join(OUT, "LabelPackStudio.html"), buildApp(OUT));
fs.copyFileSync(path.join(TOOLS, "icone.ico"), path.join(OUT, "lib", "icone.ico"));
// Lanceur et installeur Windows en batch pur (aucune dépendance à PowerShell pour fonctionner) ; messages sans accents (console Windows).
const LAUNCHER = `@echo off
setlocal
rem Ouvre Label Pack Studio en fenetre d'application (Edge, sinon Chrome, sinon navigateur par defaut).
set "HTML=%~dp0LabelPackStudio.html"
if exist "%HTML%" goto ouvrir
echo.
echo  Fichier introuvable : "%HTML%"
echo  Decompressez d'abord le fichier ZIP : clic droit sur le ZIP, puis "Extraire tout".
echo.
pause
exit /b 1
:ouvrir
set "URL=file:///%HTML:\\=/%"
reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\msedge.exe" >nul 2>&1 && (start "" msedge --app="%URL%" & exit /b 0)
reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\msedge.exe" >nul 2>&1 && (start "" msedge --app="%URL%" & exit /b 0)
reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe" >nul 2>&1 && (start "" chrome --app="%URL%" & exit /b 0)
reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe" >nul 2>&1 && (start "" chrome --app="%URL%" & exit /b 0)
start "" "%HTML%"
`;
write(path.join(OUT, "Ouvrir Label Pack Studio.cmd"), crlf(LAUNCHER));
write(path.join(OUT, "1 - Installer sur ce PC (Windows).cmd"), crlf(`@echo off
setlocal
title Installation de Label Pack Studio
set "SRC=%~dp0"
if not exist "%SRC%LabelPackStudio.html" goto pas_extrait
set "DEST=%LOCALAPPDATA%\\LabelPackStudio"
echo.
echo  Installation de Label Pack Studio dans :
echo    %DEST%
echo.
robocopy "%SRC%." "%DEST%" /E /XD Illustrator /R:1 /W:1 /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 goto erreur_copie
if not exist "%DEST%\\LabelPackStudio.html" goto erreur_copie
echo  [OK] Fichiers copies.

rem Navigateur pour le mode application (chemin lu dans le registre Windows)
set "BROWSER="
for %%K in (HKLM HKCU) do if not defined BROWSER for /f "tokens=*" %%L in ('reg query "%%K\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\msedge.exe" /ve 2^>nul ^| find "REG_SZ"') do set "LINE=%%L"
if defined LINE call set "BROWSER=%%LINE:*REG_SZ=%%"
if not defined BROWSER for %%K in (HKLM HKCU) do if not defined LINE2 for /f "tokens=*" %%L in ('reg query "%%K\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe" /ve 2^>nul ^| find "REG_SZ"') do set "LINE2=%%L"
if not defined BROWSER if defined LINE2 call set "BROWSER=%%LINE2:*REG_SZ=%%"
if defined BROWSER for /f "tokens=*" %%B in ("%BROWSER%") do set "BROWSER=%%~B"
set "TGT=%BROWSER%"
set "ARGS=--app=file:///%DEST:\\=/%/LabelPackStudio.html"
if not defined BROWSER set "TGT=%DEST%\\LabelPackStudio.html"
if not defined BROWSER set "ARGS="
if not exist "%TGT%" set "TGT=%DEST%\\LabelPackStudio.html"
if not exist "%TGT%" set "ARGS="
set "ICO=%DEST%\\lib\\icone.ico"

rem Raccourcis Bureau et menu Demarrer (PowerShell si disponible, sinon lanceur de secours)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$w=New-Object -ComObject WScript.Shell; foreach($d in @([Environment]::GetFolderPath('Desktop'),[Environment]::GetFolderPath('Programs'))){ $s=$w.CreateShortcut((Join-Path $d 'Label Pack Studio.lnk')); $s.TargetPath=$env:TGT; $s.Arguments=$env:ARGS; $s.WorkingDirectory=$env:DEST; $s.IconLocation=$env:ICO; $s.Description='Label Pack Studio'; $s.Save() }" >nul 2>&1
if errorlevel 1 goto raccourci_secours
echo  [OK] Raccourcis "Label Pack Studio" crees sur le Bureau et dans le menu Demarrer.
goto lancer

:raccourci_secours
set "DESK=%USERPROFILE%\\Desktop"
if defined OneDrive if exist "%OneDrive%\\Desktop" set "DESK=%OneDrive%\\Desktop"
> "%DESK%\\Label Pack Studio.cmd" echo @call "%DEST%\\Ouvrir Label Pack Studio.cmd"
echo  [OK] Lanceur "Label Pack Studio" cree sur le Bureau.

:lancer
echo.
echo  Installation terminee. Ouverture de Label Pack Studio...
call "%DEST%\\Ouvrir Label Pack Studio.cmd"
echo.
pause
exit /b 0

:pas_extrait
echo.
echo  ERREUR : ce fichier est lance depuis l'interieur du ZIP.
echo  1. Fermez cette fenetre.
echo  2. Clic droit sur LabelPackStudio.zip, puis "Extraire tout...".
echo  3. Ouvrez le dossier extrait et relancez "1 - Installer sur ce PC (Windows)".
echo.
pause
exit /b 1

:erreur_copie
echo.
echo  ERREUR : copie impossible vers %DEST%
echo  Solution immediate : dans le dossier extrait, double-cliquez sur LabelPackStudio.html
echo  (l'application s'ouvre dans votre navigateur, sans installation).
echo.
pause
exit /b 1
`));
write(path.join(OUT, "Ouvrir Label Pack Studio (Mac).command"), `#!/bin/bash
# Ouvre Label Pack Studio dans une fenêtre d'application (Chrome ou Edge), sinon dans le navigateur par défaut.
DIR="$(cd "$(dirname "$0")" && pwd)"
HTML="$DIR/LabelPackStudio.html"
URL="file://\${HTML// /%20}"
if [ -d "/Applications/Google Chrome.app" ]; then open -na "Google Chrome" --args --app="$URL"
elif [ -d "/Applications/Microsoft Edge.app" ]; then open -na "Microsoft Edge" --args --app="$URL"
else open "$HTML"; fi
`, 0o755);

// 2) Panneau Illustrator (extension CEP)
const EXT = path.join(OUT, "Illustrator", "com.labelpack.studio");
write(path.join(EXT, "index.html"), buildApp(EXT));
write(path.join(EXT, "CSXS", "manifest.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<ExtensionManifest Version="7.0" ExtensionBundleId="com.labelpack.studio" ExtensionBundleVersion="${VERSION}" ExtensionBundleName="Label Pack Studio" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <ExtensionList>
    <Extension Id="com.labelpack.studio.panel" Version="${VERSION}"/>
  </ExtensionList>
  <ExecutionEnvironment>
    <HostList>
      <Host Name="ILST" Version="[22.0,99.9]"/>
    </HostList>
    <LocaleList>
      <Locale Code="All"/>
    </LocaleList>
    <RequiredRuntimeList>
      <RequiredRuntime Name="CSXS" Version="9.0"/>
    </RequiredRuntimeList>
  </ExecutionEnvironment>
  <DispatchInfoList>
    <Extension Id="com.labelpack.studio.panel">
      <DispatchInfo>
        <Resources>
          <MainPath>./index.html</MainPath>
          <CEFCommandLine>
            <Parameter>--allow-file-access-from-files</Parameter>
            <Parameter>--allow-file-access</Parameter>
            <Parameter>--enable-webgl</Parameter>
            <Parameter>--ignore-gpu-blocklist</Parameter>
          </CEFCommandLine>
        </Resources>
        <Lifecycle>
          <AutoVisible>true</AutoVisible>
        </Lifecycle>
        <UI>
          <Type>Panel</Type>
          <Menu>Label Pack Studio</Menu>
          <Geometry>
            <Size><Height>860</Height><Width>1360</Width></Size>
            <MinSize><Height>480</Height><Width>720</Width></MinSize>
          </Geometry>
        </UI>
      </DispatchInfo>
    </Extension>
  </DispatchInfoList>
</ExtensionManifest>
`);
write(path.join(OUT, "Illustrator", "Installer le panneau Illustrator (Windows).bat"), crlf(`@echo off
title Installation du panneau Label Pack Studio pour Illustrator
set "DEST=%APPDATA%\\Adobe\\CEP\\extensions\\com.labelpack.studio"
if exist "%DEST%" rmdir /S /Q "%DEST%"
xcopy /E /I /Y /Q "%~dp0com.labelpack.studio" "%DEST%" >nul
for %%v in (9 10 11 12 13) do reg add "HKCU\\Software\\Adobe\\CSXS.%%v" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul
echo.
echo Panneau installe. Redemarrez Illustrator puis ouvrez :
echo     Fenetre ^> Extensions ^> Label Pack Studio
echo.
pause
`));
write(path.join(OUT, "Illustrator", "Installer le panneau Illustrator (Mac).command"), `#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/Library/Application Support/Adobe/CEP/extensions/com.labelpack.studio"
rm -rf "$DEST"; mkdir -p "$(dirname "$DEST")"
cp -R "$DIR/com.labelpack.studio" "$DEST"
for v in 9 10 11 12 13; do defaults write com.adobe.CSXS.$v PlayerDebugMode 1; done
echo ""
echo "Panneau installé. Redémarrez Illustrator puis ouvrez : Fenêtre > Extensions > Label Pack Studio"
`, 0o755);

write(path.join(OUT, "LISEZ-MOI.txt"), crlf(`LABEL PACK STUDIO ${VERSION} — version installable
=====================================================

Aucun serveur, aucune connexion Internet, aucun compte : tout fonctionne sur le poste.

INSTALLATION SUR WINDOWS (une fois par poste)
1. Faites un clic droit sur le fichier ZIP > « Extraire tout… » (ne lancez rien depuis l'intérieur du ZIP).
2. Double-cliquez sur « 1 - Installer sur ce PC (Windows) ». L'application s'ouvre à la fin de l'installation.
3. Ouvrez Label Pack Studio depuis le raccourci du Bureau ou du menu Démarrer.
   Si Windows affiche « Windows a protégé votre ordinateur », cliquez sur « Informations complémentaires » puis « Exécuter quand même ».
Pour essayer sans installer : double-cliquez sur « Ouvrir Label Pack Studio ».
SOLUTION DE SECOURS, toujours valable : double-cliquez sur « LabelPackStudio.html » ; l'application s'ouvre dans le navigateur.

MAC
Double-cliquez sur « Ouvrir Label Pack Studio (Mac).command »
(la première fois : clic droit > Ouvrir, pour autoriser le fichier).

NAVIGATEUR
L'application s'ouvre dans Microsoft Edge ou Google Chrome, en fenêtre d'application.
Ces navigateurs sont recommandés (rendu 3D, exports vidéo MP4). Firefox et Safari fonctionnent avec des limites (vidéo).

PANNEAU ILLUSTRATOR (Adobe Illustrator 2018 ou plus récent)
1. Dans le dossier « Illustrator », double-cliquez sur « Installer le panneau Illustrator (Windows).bat »
   (ou « (Mac).command » sur Mac).
2. Redémarrez Illustrator puis : Fenêtre > Extensions > Label Pack Studio.
3. Dans le panneau : Exporter > « Envoyer vers Illustrator » crée le document (calques Visuel, Fond perdu,
   Rainage, Coupe ; tons directs « CutContour » et « Rainage »). « Importer le document Illustrator »
   (bibliothèque) relit un gabarit dessiné ou retouché dans Illustrator.
Sans le panneau, le menu Exporter > « Script Illustrator » produit un script à lancer dans Illustrator
(Fichier > Scripts > Autre script…).

VOS DONNÉES
Projets, tarifs et chartes sont enregistrés dans le navigateur de chaque poste.
Pensez à faire régulièrement : Paramètres > « Sauvegarder les données » (fichier .json),
et « Restaurer » pour les recharger sur un autre poste ou après une réinstallation.
Le panneau Illustrator a son propre espace : utilisez la même sauvegarde pour y retrouver vos projets.

FONCTIONS RÉSERVÉES À LA VERSION EN LIGNE (claude.ai)
Assistant IA (designs, structures, fonds sur mesure), projets partagés en équipe et liens clients.
Tout le reste (modèles, 3D, plans, devis, BAT, PDF d'impression, exports) est disponible hors ligne.
`));

// 3) Archive
execFileSync("zip", ["-qr9X", "LabelPackStudio.zip", "LabelPackStudio"], {cwd:DIST});
const size = fs.statSync(path.join(DIST, "LabelPackStudio.zip")).size;
console.log(`dist/LabelPackStudio.zip : ${(size/1048576).toFixed(1)} Mo`);
