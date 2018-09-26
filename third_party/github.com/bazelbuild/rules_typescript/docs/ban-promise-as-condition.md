<!-- FIXME(alexeagle): generate the docs from the sources -->

# Don't use promises as conditionals

Don't write conditionals like this:

    if (returnsPromise()) {
        // stuff
    }

Promises are always truthy, so this assertion will never fail. Usually, the
intention was to match the result of the promise. If that's the case, simply add
an `await`.

    if (await returnsPromise()) {
        // stuff
    }

## Examples

### Webdriver pre-4.0

In the past, WebDriver had a promise manager that scheduled commands and made it
easy to write tests that appeared synchronous despite the fact that each command
was being sent asynchronously to the browser. This led to confusing behavior and
sometimes code like this was written:

    function isOk() {
        see('Loading');
        return find('Ok').isPresent();
    }

    function doStuff() {
        click('Start');
        if (isOk()) {
            // Do stuff when the page says 'ok'
        } else {
            // Do something else if that page isn't ok
        }
    }

The return value of isOk() was a promise, but someone who took synchronicity for
granted would think it's a boolean. Here the if statement could never reach the
else block.

### Refactoring

Similar mistakes can be made if the helper function goes from synchronous to an
async function without changing all of the callers to await it.
