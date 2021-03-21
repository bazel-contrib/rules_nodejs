// Try to load on unstripped path, this should fail
try {
    require("stripped_library/library/file");
} catch (exc) {
    if (exc.code !== 'MODULE_NOT_FOUND') throw exc;
}

// Load with the stripped path, this should succeed
require("stripped_library/file");
