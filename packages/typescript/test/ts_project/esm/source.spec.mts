import { APP_NAME } from "./source.mjs";
import { APP_NAME2 } from "./source2.mjs";
import * as angularCore from '@angular/core';

describe('spec in file ending with *.mjs', () => {
    it('should run', () => {
        expect(APP_NAME).toBe('typescript');
        expect(APP_NAME2).toBe('typescript2');
        expect(angularCore).toBeDefined();
    });
});
