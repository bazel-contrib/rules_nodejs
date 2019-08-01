/// <reference types="zone.js" />
/// <reference types="hammerjs" />

// The jasmine types are resolved because the tsconfig.json
// for this compilation includes "types": ["jasmine"].
// This file will fail to compile if that mechanism of including types
// is broken

describe('reference types directive resolution', () => {
  it('should resolve zone.js types from node_modules/zone.js/dist/zone.js.d.ts', () => {
    // The type of Zone should resolve above or this will fail to compile
    let zone: Zone;
    expect(1).toEqual(1);
  });

  it('should resolve hammerjs types from node_modules/@types/hammerjs/index.d.ts', () => {
    // The type of HammerStatic should resolve above or this will fail to compile
    let hammer: HammerStatic;
    expect(1).toEqual(1);
  });
});
