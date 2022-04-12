const create = require('@foo/lib').drawing;
const sharp = require('sharp');

(async () => {
    const data = await sharp({create}).png().toBuffer();
    console.log(data.toString('base64'))
})()