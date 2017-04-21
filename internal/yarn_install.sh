set -ex

ROOT=$(dirname $1)
YARN=$2
(
  cd $ROOT
  $YARN install
)
