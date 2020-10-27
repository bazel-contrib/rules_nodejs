archived=$1
if [ -f "$archived" ]; then
    echo "RUNFILES are supported in this OS"
    # run files are supported (not windows os), we can read the
    # input from arguments directly
    rm -rf ./pack && mkdir ./pack
    tar -xvzf $1 -C ./pack
    diff -r ./pack/package $2
    if [ $? -ne 0 ]; then
        echo "The directory was modified";
        exit 1
    fi
else
    # runfiles are not supported in Windows,
    # hard coding the test input for now
    rm -rf ./pack && mkdir ./pack
    tar -xvzf ../../test-pkg.tgz -C ./pack
    diff ./pack/package ../../test_pkg
    if [ $? -ne 0 ]; then
        echo "The directory was modified";
        exit 1
    fi
fi

exit 0