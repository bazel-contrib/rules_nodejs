import 'jasmine';
import {ClassContainingUserDefinedCheckReturnValueFunction, manyJsDocTags, userDefinedCheckReturnValueFunction} from './user_defined_check_return_value';

userDefinedCheckReturnValueFunction('hello');
manyJsDocTags('hello');

new ClassContainingUserDefinedCheckReturnValueFunction().checkReturnValue(
    'hello');
new ClassContainingUserDefinedCheckReturnValueFunction().sameLineJsDoc('hello');
new ClassContainingUserDefinedCheckReturnValueFunction().noJsDoc('hello');

const nested = {
  child: new ClassContainingUserDefinedCheckReturnValueFunction()
};
nested.child.checkReturnValue('hello');
expect(null);
