#!/bin/sh

SIZE=1024
DIR="./dist"

for f in `ls $DIR/*.png`; do
    outfile=$DIR/`basename -s .png $f`-thumbnail.png
    magick $f -gravity center \
           -thumbnail ${SIZE}x${SIZE}^ \
           -extent ${SIZE}x${SIZE} \
           $outfile
done
