#!/bin/bash
# Eşya sırası A/B (2v2 Uzman, kendi kopyasına karşı): tools/buildq.sh <çıktı> <tohum> <maç> <kahraman> <build1> [build2 ...]
# İki takımın ilk kahramanı <kahraman>; A takımı items.js BUILDS[kahraman][buildN], B takımı default.
out=$1; seed=$2; n=$3; hero=$4; shift 4
for bd in "$@"; do r=$(node tools/aivs2.js --matches $n --diff expert --aiB cand --seed $seed --early 1 --hero $hero --buildA $bd 2>&1 | grep -E "kazanma|^ölüm|10. dk" | tr '\n' ' '); echo "$hero $bd | $r" >> $out; done
echo DONE >> $out
