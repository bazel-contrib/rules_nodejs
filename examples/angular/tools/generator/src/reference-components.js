const fs = require('fs');

module.exports.referenceComponents = function referenceComponents(file, {selectorAcc}) {
  fs.writeFileSync(
    file,
    selectorAcc.map(s => `<${s}></${s}>`).join('\n'));
};