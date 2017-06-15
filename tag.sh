git tag -d latest
git push origin :refs/tags/latest
git tag -f latest
git push origin master --tags
