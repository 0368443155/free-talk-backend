GIT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
msg="update code"
if [ $# -gt 0 ]; then
  msg=$1
fi

git add .
git commit -m "$msg"
git push origin $GIT_BRANCH