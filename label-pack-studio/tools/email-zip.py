# Version de l'application compatible avec l'envoi par Gmail : pas de .js, .cmd, .bat ni .command dans l'archive.
import zipfile, os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dist"))
SRC, OUT, auto = "LabelPackStudio", "LabelPackStudio-email.zip", open("LabelPackStudio-autonome.html", "rb").read()
BLOCK = (".cmd", ".bat", ".js", ".command", ".exe", ".ps1", ".vbs")
LISEZ = """LABEL PACK STUDIO - VERSION ENVOYEE PAR E-MAIL
================================================

1. Decompressez ce dossier : clic droit sur le fichier ZIP > Extraire tout.

2. UTILISER L'APPLICATION (le plus simple)
   Clic droit sur "LabelPackStudio.html" > Ouvrir avec > Google Chrome (ou Microsoft Edge).
   Aucune installation ni connexion Internet n'est necessaire.

3. INSTALLER SUR LE PC (icone sur le Bureau, facultatif)
   Gmail interdit l'envoi de programmes d'installation : ils sont livres avec l'extension ".txt".
   a) Dans l'Explorateur : Affichage > Afficher > cochez "Extensions de noms de fichiers".
   b) Renommez "1 - Installer sur ce PC (Windows).cmd.txt" en "1 - Installer sur ce PC (Windows).cmd"
      (supprimez seulement ".txt" a la fin), puis double-cliquez dessus.
   c) Faites de meme avec "Ouvrir Label Pack Studio.cmd.txt".

4. PANNEAU ILLUSTRATOR (facultatif)
   Dans le dossier "Illustrator", renommez "Installer le panneau Illustrator (Windows).bat.txt"
   en ".bat", double-cliquez, puis redemarrez Illustrator : Fenetre > Extensions > Label Pack Studio.

5. TRAVAIL EN EQUIPE
   Parametres > Dossier partage de l'equipe : choisissez le meme dossier reseau sur chaque poste.

Si Windows affiche "Windows a protege votre ordinateur" : Informations complementaires > Executer quand meme.
"""
z = zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED)
for root, _, files in os.walk(SRC):
    if "/fonts" in root.replace("\\", "/"): continue
    for f in files:
        p = os.path.join(root, f); rel = os.path.relpath(p, ".")
        if f.endswith(".js"): continue
        if f == "LabelPackStudio.html" or (f == "index.html" and "com.labelpack.studio" in root): z.writestr(rel, auto); continue
        if f == "LISEZ-MOI.txt": z.writestr(rel, LISEZ.replace("\n", "\r\n")); continue
        z.write(p, rel + (".txt" if f.endswith(BLOCK) else ""))
z.close()
names = zipfile.ZipFile(OUT).namelist()
assert not [n for n in names if n.lower().endswith(BLOCK)]
print(OUT, round(os.path.getsize(OUT) / 1e6, 2), "Mo,", len(names), "fichiers")
