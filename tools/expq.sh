#!/bin/bash
# Deney kuyruğu (bulut oturumları için): tools/expq.sh <çıktı> <tohum> <maç> '<tune1>' '<tune2>' ...
# Her ayar için aivs2 (Uzman yeni vs eski2, erken bitirme) çalışır, "ayar | kazanma" satırı çıktıya eklenir.
out=$1; seed=$2; n=$3; shift 3
for t in "$@"; do r=$(node tools/aivs2.js --matches $n --seed $seed --early 1 --tune "$t" 2>&1 | grep kazanma); echo "$t | $r" >> $out; done
echo DONE >> $out
