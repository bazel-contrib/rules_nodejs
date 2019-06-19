// Test that we can declare an interface named Client
// which would conflict with typescript/lib/lib.webworker.d.ts if that
// lib was included but should work if that lib is not
declare class Client { id: string; }
