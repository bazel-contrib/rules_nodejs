bazel clean --expunge
bazel build :src

echo "building with Webpack"
time bazel build :HelloWebpack 
echo "\n\n\n"
echo "building with VueCLI"
time bazel build :HelloWorld
