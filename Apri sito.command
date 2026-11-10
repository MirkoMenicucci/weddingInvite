#!/bin/bash
# Doppio clic per vedere il sito come sarà online (con tutte le foto nella scena 3D).
# Chiudi questa finestra del Terminale per spegnerlo.
cd "$(dirname "$0")"
PORT=8765
python3 -m http.server $PORT >/dev/null 2>&1 &
SERVER=$!
trap "kill $SERVER 2>/dev/null" EXIT
sleep 1
open "http://localhost:$PORT/index.html"
echo "Sito aperto su http://localhost:$PORT — chiudi questa finestra per spegnerlo."
wait $SERVER
