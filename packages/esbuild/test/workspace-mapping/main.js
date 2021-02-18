import {getId as m1Id} from 'build_bazel_rules_nodejs/packages/esbuild/test/workspace-mapping/module-one';
import {getId as m2Id} from 'build_bazel_rules_nodejs/packages/esbuild/test/workspace-mapping/module-two';

export default `Full ID: ${m1Id} - ${m2Id}`;
