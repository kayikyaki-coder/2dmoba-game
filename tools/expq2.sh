#!/bin/bash
# Deney kuyruğu, kendi kopyasına karşı (A/B): tools/expq2.sh <çıktı> <tohum> <maç> '<tune1>' ... ; aiB=cand, Uzman
out=$1; seed=$2; n=$3; shift 3
for t in "$@"; do r=$(node tools/aivs2.js --matches $n --diff expert --aiB cand --seed $seed --early 1 --tune "$t" 2>&1 | grep -E "kazanma|^ölüm|10. dk" | tr '\n' ' '); echo "$t | $r" >> $out; done
echo DONE >> $out
