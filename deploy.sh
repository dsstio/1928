#!/bin/sh

# load nodejs
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# check for required binaries
type uglify 2>/dev/null || { echo >&2 "Please install uglify: 'npm install -g uglify';"; exit 1; }

# change to script dir
cd $( dirname $0 );

# get latest copy
git pull;

# clean up old dist-generator-dir if present
rm -rf dist-new;

# create fs structure
mkdir -p dist-new/assets/{css,js,images,data};

# copy files
cp -r assets/data/* dist-new/assets/data/.;
cp -r assets/images/* dist-new/assets/images/.;

# minify 
uglify -s assets/js/jquery.min.js,assets/js/leaflet.js,assets/js/1928.js -o dist-new/assets/js/1928.min.js;
uglify -c -s assets/css/leaflet.css,assets/css/1928.css -o dist-new/assets/css/1928.min.css;

# modify html
cat index.html | grep -v leaflet | grep -v jquery > dist-new/index.html;
perl -pi -e 's/1928.css/1928.min.css/g' dist-new/index.html;
perl -pi -e 's/1928.js/1928.min.js/g' dist-new/index.html;
perl -pi -e 's/^\s+//g' dist-new/index.html;
perl -pi -e 's/ +/ /g' dist-new/index.html;
perl -pi -e 's/\n+/\n/gm' dist-new/index.html;
perl -pi -e 's/(<[^\/][^>]+>)[ ]+|[ ]+(<\/)/$1$2/gm' dist-new/index.html;

# make static gzip
gzip -kf9 dist-new/index.html;
gzip -kf9 dist-new/assets/js/1928.min.js;
gzip -kf9 dist-new/assets/css/1928.min.css;
for i in `ls dist-new/assets/images/ | grep -v gz`; do gzip -kf9 dist-new/assets/images/$i; done;
for i in `ls dist-new/assets/data/ | grep -v gz`; do gzip -kf9 dist-new/assets/data/$i; done;

# copy browserconfig and favicon to root
wget https://data.tagesspiegel.de/favicon/favicon.ico -O dist-new/favicon.ico;

# robots.txt
echo "User-agent: *" >> dist-new/robots.txt;
echo "Disallow: " >> dist-new/robots.txt;

# switch
mkdir -p dist;
mv dist dist-old && mv dist-new dist && rm -rf dist-old;

# boomya.
echo "done";
