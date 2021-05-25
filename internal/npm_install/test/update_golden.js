const {check, files} = require('./check');

files.forEach(file => check('fine_grained_goldens', 'golden', file, true));
files.forEach(
    file => check('fine_grained_goldens_multi_linked', 'golden_multi_linked', file, true));
    files.forEach(
        file => check('fine_grained_directory_artifacts_goldens', 'golden_directory_artifacts', file, true));
    