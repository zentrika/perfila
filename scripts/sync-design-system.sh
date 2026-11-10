#!/bin/sh
# Copia versionada del design system de ZENTRIKA hacia Perfila (sin acoplar despliegues).
# La fuente canónica vive en ../ZentrikaOS/design-system/.
#   sh scripts/sync-design-system.sh          → sincroniza
#   sh scripts/sync-design-system.sh --check  → solo verifica que la copia esté al día (sale con 1 si no)
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$(cd "$ROOT/.." && pwd)/ZentrikaOS/design-system"
DEST="$ROOT/src/design-system"
[ -d "$SRC" ] || { echo "✗ No encuentro $SRC"; exit 1; }
VERSION="$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['\$version'])" "$SRC/tokens/tokens.json")"

if [ "${1:-}" = "--check" ]; then
  if [ ! -f "$DEST/VERSION" ] || [ "$(cat "$DEST/VERSION")" != "$VERSION" ]; then
    echo "✗ Perfila tiene una copia desfasada del design system (esperada $VERSION)."; exit 1
  fi
  diff -rq "$SRC/tokens" "$DEST/tokens" >/dev/null && diff -rq "$SRC/assets/logo" "$DEST/logo" >/dev/null \
    && echo "✓ Copia al día ($VERSION)." || { echo "✗ La copia difiere del origen. Ejecuta la sincronización."; exit 1; }
  exit 0
fi

mkdir -p "$DEST"
rm -rf "$DEST/tokens" "$DEST/logo"
cp -R "$SRC/tokens" "$DEST/tokens"
cp -R "$SRC/assets/logo" "$DEST/logo"
printf '%s\n' "$VERSION" > "$DEST/VERSION"
cat > "$DEST/README.md" <<MD
# Design system de ZENTRIKA — copia sincronizada (v$VERSION)

**No edites estos archivos aquí.** La fuente canónica está en \`ZentrikaOS/design-system/\`.
Para actualizar: \`npm run sync:design-system\` (y \`npm run check:design-system\` en CI).

* \`tokens/tokens.css\` — variables \`--zk-*\` · \`tokens/tokens.json\` — valores canónicos
* \`logo/*.svg\` — logotipo, isotipo, variantes, icono y favicon
MD
echo "✓ Design system v$VERSION copiado en $DEST"
