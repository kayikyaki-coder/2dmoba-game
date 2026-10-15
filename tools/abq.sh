#!/bin/bash
# Bot A/B kuyruğu: tools/abq.sh <çıktı> "<diff> <tohum> <tune-json>" ... ; her satır: ayar | kazanma | ölüm | 10. dk servet farkı
out=$1; shift
for c in "$@"; do set -- $c; r=$(node tools/aivs2.js --matches 160 --diff $1 --aiB cand --seed $2 --early 1 --tune "$3" 2>&1); echo "$c | $(echo "$r" | grep kazanma) | $(echo "$r" | grep -i 'ölüm' | head -2 | tr '\n' ' ') | $(echo "$r" | grep '10. dk')" >> $out; done
echo DONE >> $out
