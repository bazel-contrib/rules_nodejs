jest = require('jest')
fs = require('fs-extra')
path = require('path')
process = require('process')

// [0], [1] is node executable and script path
npm_ws_name = process.argv[2]
package_name = process.argv[3]

var packageJson = {
	jest: {
		modulePaths: [
			path.join(process.cwd(),
				'external/{}/node_modules'.replace('{}', npm_ws_name))
		]
	}
}

console.log('Current directory ' + process.cwd())


console.log('Changing directory to ' + package_name)
process.chdir(package_name)

console.log('Writing package.json for jest')
fs.writeFileSync('package.json', JSON.stringify(packageJson));

console.log('Copying tests over temp directory')
fs.copySync('tests', 'jest', {
	dereference: true,
});

jest.run();
