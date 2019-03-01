<!-- FIXME(alexeagle): generate the docs from the sources -->

# Property renaming safe

This check will reject code patterns that are likely to not be safe for an
optimization known as "property renaming". Closure compiler is currently one of
the main JS optimizer that performs that optimization and anecdotally it results
in 5-10% smaller bundles (see [more
info](http://closuretools.blogspot.com/2011/01/property-by-any-other-name-part-1.html)).

Property renaming is the optimization where writes and accesses to object
properties like `x.userName` are rewritten to a shorter name like `x.a`. It
works great until other code expects the property to be the specific string
'userName'. This check will help catch bad optimization errors like this earlier
(during TS compilation).

The check will reject a property access on an object through an index signature
in its type. For example, if you write this:

  interface IdxSig {
    [key: string]: string;
  }

  function propAccess(x: IdxSig) {
    x.prop;     // new error
    x['prop'];  // ok
  }


the compiler will start erring like this:

  .../errors.ts:6:5 - error TS21227: Property prop is not declared on Type IdxSig.
  The type has a string index signature, but it is being accessed using a dotted
  property access.

  6   x.prop;     // new error


The presence of an index signature in the type most often means that the
properties of the object that carries that type are created outside the static
property renaming scope - for example JSON.parse, or dynamic for-in loop. Thus
accessing them without a quoted index signature will result in an incorrect
optimization.
