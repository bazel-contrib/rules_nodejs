#!/usr/bin/env bash

set -u -e -o pipefail

function die {
  printf "\n"
  printf "=================================================================================\n"
  printf "ERROR [publish_snapshots.sh]:\n"
  printf "$1\n"
  printf "=================================================================================\n"
  exit 1
}

if [ $# -lt 1 ]; then
  printf "\n"
  printf "=================================================================================\n"
  printf "Usage:\n"
  printf "$ ./scripts/publish_snapshots.sh github_org [git_scheme:ssh,http]\n"
  printf "\n"
  printf "To automatically create a new GitHub repo:\n"
  printf "$ export GITHUB_TOKEN=[get one from https://github.com/settings/tokens]\n"
  printf "$ CREATE_REPOS=1 ./scripts/publish_snapshots.sh ...\n"
  printf "=================================================================================\n"
  exit 1
fi

readonly RULES_NODEJS_DIR=$(cd $(dirname "$0")/..; pwd)

# Use the bazel version from node_modules
readonly BAZEL_BIN="${RULES_NODEJS_DIR}/node_modules/.bin/bazelisk"

# Use a new output_base so we get a clean build
# Bazel can't know if the git metadata changed
readonly OUTPUT_BASE="--output_base=$(mktemp -d -t bazel-release.XXXXXXX)"

readonly BAZEL="${BAZEL_BIN} ${OUTPUT_BASE}"
readonly BAZEL_BUILD_OPT="--config=release"

readonly GITHUB_REPO="rules_nodejs-builds"
readonly GITHUB_ORG=${1:-bazelbuild}
readonly GIT_SCHEME=${2:-ssh}

# Fetch the current rules_nodejs version from package.json
readonly BUILD_VERSION=$(node -p -e "require('${RULES_NODEJS_DIR}/package.json').version")

# Fetch git properties
readonly GIT_SHA=`git rev-parse HEAD`
readonly GIT_SHORT_SHA=`git rev-parse --short HEAD`
readonly GIT_COMMIT_MSG=`git log --oneline -1`
readonly GIT_COMMITTER_USER_NAME=`git --no-pager show -s --format='%cN' HEAD`
readonly GIT_COMMITTER_USER_EMAIL=`git --no-pager show -s --format='%cE' HEAD`
readonly GIT_BRANCH=`git symbolic-ref --short HEAD`
readonly GIT_CHANGED=`git diff-index --name-only HEAD --`
if [ ! -z $GIT_CHANGED ]; then
  readonly GIT_MOD_SHA=-`git diff-index --name-only HEAD -- | shasum -a 256 | awk '{ print $1 }'`
fi

# Determine the branch name
# $CI_BRANCH is the branch being built on CI; e.g. `pull/12345` for PR builds.
readonly BUILD_BRANCH=${CI_BRANCH:-${GIT_BRANCH}}

# Diagnostics output
echo "BAZEL                    : ${BAZEL}"
echo "BAZEL_BUILD_OPT          : ${BAZEL_BUILD_OPT}"
echo "GITHUB_ORG               : ${GITHUB_ORG}"
echo "GIT_SCHEME               : ${GIT_SCHEME}"
echo "BUILD_VERSION            : ${BUILD_VERSION}"
echo "BUILD_BRANCH             : ${BUILD_BRANCH}"
echo "GIT_SHA                  : ${GIT_SHA}"
echo "GIT_SHORT_SHA            : ${GIT_SHORT_SHA}"
echo "GIT_COMMIT_MSG           : ${GIT_COMMIT_MSG}"
echo "GIT_COMMITTER_USER_NAME  : ${GIT_COMMITTER_USER_NAME}"
echo "GIT_COMMITTER_USER_EMAIL : ${GIT_COMMITTER_USER_EMAIL}"
echo "GIT_BRANCH               : ${GIT_BRANCH}"
echo "GIT_MOD_SHA              : ${GIT_MOD_SHA:-}"

if [ "${GITHUB_ORG}" == "bazelbuild" ]; then
  die "Publishing to bazelbuild GitHub org not yet support"
fi

####################################################################################################
# publishRepo()
#
# Args:
#   $1 - GitHub org to publish to
#   $2 - GitHub repo to publish to
#   $3 - GitHub branch to publish to
#   $4 - Version to tag with
#   $5 - Directory to publish
function publishRepo {
  local -r github_org=$1
  local -r github_repo=$2
  local -r github_branch=$3
  local -r version_tag=$4
  local -r artifacts_dir=$5

  local -r publish_dir=$(mktemp -d -t bazel-${github_org}-${github_repo}.XXXXXXX)

  local repo_url=""
  if [[ "$GIT_SCHEME" == "ssh" ]]; then
    repo_url="git@github.com:${github_org}/${github_repo}.git"
  elif [[ "$GIT_SCHEME" == "http" ]]; then
    repo_url="https://github.com/${github_org}/${github_repo}.git"
  else
    die "Don't have a way to publish to scheme $GIT_SCHEME"
  fi

  if [ -n "${CREATE_REPOS:-}" ]; then
    echo "Creating GitHub repository ${github_org}/${github_repo}"
    if [ -z "${GITHUB_TOKEN:-}" ]; then
      die "GITHUB_TOKEN not set; cannot create repository"
    fi
    curl -u "${github_org}:${GITHUB_TOKEN}" https://api.github.com/user/repos \
         -d '{"name":"'${github_repo}'", "auto_init": true}'
  fi

  echo "Pushing build artifacts to ${repo_url}"

  # create local repo folder and clone build repo into it
  (
    cd ${publish_dir} && \
    git init && \
    git remote add origin $repo_url && \
    # use the remote branch if it exists
    if git ls-remote --exit-code origin ${github_branch}; then
      git fetch origin ${github_branch} --depth=1 && \
      git checkout origin/${github_branch}
    fi
    git checkout -b "${github_branch}"
  )

  # copy over build artifacts into the repo directory
  cp -R $artifacts_dir/* $publish_dir/

  if [[ ${CI:-} ]]; then
    die "Publishing from CI not yet supported"
  fi

  (
    cd $publish_dir && \
    git config user.name "${GIT_COMMITTER_USER_NAME}" && \
    git config user.email "${GIT_COMMITTER_USER_EMAIL}" && \
    git add --all && \
    git commit -m "${GIT_COMMIT_MSG}" --quiet && \
    git tag "${version_tag}" && \
    git push origin "${github_branch}" --tags --force
  )
}

####################################################################################################
# buildReleaseSnapshot()

function buildReleaseSnapshot {
  local -r snapshot_dir=$1
  local -r snapshot_tag=$2

  # Location of built release archive
  local -r built_archive="dist/bin/release.tar.gz"
  local -r built_artifacts="dist/bin/rules_nodejs_package"

  # Build release archive
  echo "Building //:release"
  ${BAZEL} build ${BAZEL_BUILD_OPT} //:release

  # Copy archive to snapshot dir
  local -r release_archive="build_bazel_rules_nodejs-${BUILD_BRANCH}-snapshot.tar.gz"
  echo "Copying ${built_archive} to ${snapshot_dir}/${release_archive}"
  cp -f ${built_archive} ${snapshot_dir}/${release_archive}
  cp -rf ${built_artifacts} ${snapshot_dir}/build_bazel_rules_nodejs

  # Calculate sha256 of release archive
  local -r release_sha256=$(shasum -b -a 256 ${snapshot_dir}/${release_archive} | awk '{ print $1 }')
  echo "sha256: ${release_sha256}"

  # Append to README.md
  printf '%s\n' \
    "" \
    "## build_bazel_rules_nodejs" \
    "Add the following to your WORKSPACE to use the build_bazel_rules_nodejs snapshot build:" \
    "\`\`\`python" \
    "load(\"@bazel_tools//tools/build_defs/repo:http.bzl\", \"http_archive\")" \
    "http_archive(" \
    "    name = \"build_bazel_rules_nodejs\"," \
    "    sha256 = \"${release_sha256}\"," \
    "    urls = [\"https://github.com/${GITHUB_ORG}/${GITHUB_REPO}/raw/${snapshot_tag}/${release_archive}\"]," \
    ")" \
    "\`\`\`" >> ${snapshot_dir}/README.md
}

####################################################################################################
# buildReleaseSnapshot()

function buildNpmSnapshots {
  local -r snapshot_dir=$1
  local -r snapshot_tag=$2

  local -r pkg_tar_labels=`${BAZEL} query --output=label 'kind("pkg_tar rule", //packages/...) intersect attr("name", "archive", //packages/...)'`

  echo "Building npm package archives" ${pkg_tar_labels}
  ${BAZEL} build ${BAZEL_BUILD_OPT} ${pkg_tar_labels}

  for pkg in ${pkg_tar_labels} ; do
    (
      # Copy archive to snapshot dir
      local tmp=${pkg#\/\/packages/}
      local -r package_name=${tmp%\:archive}
      local -r built_archive="dist/bin/packages/${package_name}/archive.tar.gz"
      local -r built_artifacts="dist/bin/packages/${package_name}/npm_package"
      local -r release_archive="@bazel_${package_name}-${BUILD_BRANCH}-snapshot.tar.gz"
      echo "Copying ${built_archive} to ${snapshot_dir}/${release_archive}"
      cp -f ${built_archive} ${snapshot_dir}/${release_archive}
      cp -rf ${built_artifacts} ${snapshot_dir}/@bazel_${package_name}

      printf '%s\n' \
        "" \
        "## @bazel/${package_name}" \
        "Add the following to your package.json to use the @bazel/${package_name} snapshot build:" \
        "\`\`\`" \
        "\"@bazel/${package_name}\": \"https://github.com/${GITHUB_ORG}/${GITHUB_REPO}/raw/${snapshot_tag}/${release_archive}\"" \
        "\`\`\`" >> ${snapshot_dir}/README.md
    )
  done
}

####################################################################################################

# Make a temp folder for snapshot release
readonly SNAPSHOT_DIR=$(mktemp -d -t bazel-release-repo.XXXXXXX)
readonly SNAPSHOT_TAG="${BUILD_VERSION}+${GIT_SHORT_SHA}"

cp -f ${RULES_NODEJS_DIR}/LICENSE ${SNAPSHOT_DIR}/LICENSE

printf '%s\n' \
  "# Snapshot build of rules_nodejs" \
  "" \
  "+ DATE                     : $(date)" \
  "+ CI                       : ${CI:-false}" \
  "+ SYSTEM                   : $(uname -v)" \
  "+ BUILD_VERSION            : ${BUILD_VERSION}" \
  "+ BUILD_BRANCH             : ${BUILD_BRANCH}" \
  "+ GIT_SHA                  : ${GIT_SHA}" \
  "+ GIT_SHORT_SHA            : ${GIT_SHORT_SHA}" \
  "+ GIT_COMMIT_MSG           : ${GIT_COMMIT_MSG}" \
  "+ GIT_COMMITTER_USER_NAME  : ${GIT_COMMITTER_USER_NAME}" \
  "+ GIT_COMMITTER_USER_EMAIL : ${GIT_COMMITTER_USER_EMAIL}" \
  "+ GIT_BRANCH               : ${GIT_BRANCH}"  > ${SNAPSHOT_DIR}/README.md

buildReleaseSnapshot ${SNAPSHOT_DIR} ${SNAPSHOT_TAG}
buildNpmSnapshots ${SNAPSHOT_DIR} ${SNAPSHOT_TAG}

echo "================================================================================"
cat ${SNAPSHOT_DIR}/README.md
echo "================================================================================"

echo "Publishing to GitHub"
echo "  repo   : ${GITHUB_ORG}/${GITHUB_REPO}"
echo "  branch : ${BUILD_BRANCH}"
echo "  tag    : ${BUILD_VERSION}+${GIT_SHORT_SHA}"
echo "  from   : ${SNAPSHOT_DIR}"

publishRepo ${GITHUB_ORG} ${GITHUB_REPO} ${BUILD_BRANCH} ${SNAPSHOT_TAG} ${SNAPSHOT_DIR}
