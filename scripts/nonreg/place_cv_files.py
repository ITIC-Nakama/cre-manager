"""Non-régression (lot 9) : pose un vrai PDF (exemple fictif du dépôt) pour chaque CV généré par generate_dataset.sql,
dans le dossier de stockage LOCAL de la recette. Usage : python place_cv_files.py <dossier_stockage> <nombre_max>"""
import shutil
import sys
from pathlib import Path

root = Path(sys.argv[1])
sample = Path(__file__).resolve().parents[2] / "docs" / "cv-samples" / "classique-1-page.pdf"
(root / "cvs").mkdir(parents=True, exist_ok=True)
for n in range(1, int(sys.argv[2]) + 1):
    shutil.copyfile(sample, root / "cvs" / f"nonreg-{n}.pdf")
print("CV posés dans", root / "cvs")
