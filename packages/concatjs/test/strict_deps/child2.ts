// The line below is a strict deps violation of an @npm dep
import * as semver from 'semver';
semver.valid('1.2.3');

console.log(Symbol);
