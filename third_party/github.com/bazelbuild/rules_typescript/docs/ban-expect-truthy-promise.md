<!-- FIXME(alexeagle): generate the docs from the sources -->

## Don't expect promises toBeTruthy()

Don't write expectations like this:

    expect(returnsPromise()).toBeTruthy();

Promises are always truthy, so this assertion will never fail. Usually, the
intention was to match the result of the promise. If that's the case, simply
add an `await`.

    expect(await returnsPromise()).toBeTruthy();

### In Protractor tests

If you're not writing a Protractor test, you can safely ignore this section.

In the past, Protractor tests have patched `expect()` to automatically unwrap
promises, which made these assertions work as expected without needing an
`await`.  However, the [control flow is deprecated][1] and will be removed in
Selenium WebDriver 4.0, and these assertions are now a bug. You'll
need to `await` the promise as above.

If you can't `await` the promise because your tests need the control flow, you
can use a more specific matcher.

    expect(returnsPromise()).toBe(true);

This assertion will work as expected for now and will fail when the control flow
is finally removed.

[1]: https://github.com/SeleniumHQ/selenium/issues/2969
