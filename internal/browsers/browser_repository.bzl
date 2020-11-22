"Repository rule for managing browser binaries with bazel, used for web testing"

_DOC = """To be run in user's WORKSPACE to install browser binaries.

```python
browser_repository(
    browser_name = "firefox",
    platforms = {
        "linux": ("firefox/firefox", "https://ftp.mozilla.org/pub/firefox/releases/82.0/linux-x86_64/en-US/firefox-82.0.tar.bz2", "4305f43e72aa46ae42882eaa4e436b22c5142a4c9b2dc9f9ccc3292e18a5e39a"),
        "mac": ("Firefox.app", "https://ftp.mozilla.org/pub/firefox/releases/82.0/mac/en-US/Firefox%2082.0.dmg", "5b651f2fa3c2d267c23184d29b6e6237af290575168e416ecef23128d94e8d5b"),
        "windows": ("firefox/firefox.exe", "https://archive.mozilla.org/pub/firefox/nightly/latest-mozilla-central/firefox-84.0a1.en-US.win64.zip", "c8cd8f2d55e32c100c0e2bd118582153a403ddf70b87f2566993b51414a1685e"),
    },
)
```
"""
_ATTRS = {
    "browser_name": attr.string(
        mandatory = True,
        doc = """The name of the browser like (firefox)

        Used for selecting the binary @browsers//browser_name
        """,
    ),
    "platforms": attr.string_list_dict(
        mandatory = True,
        doc = """Dictonary of platforms with a list of the properties.

The key is the platform and has to be one of those strings ('linux', 'windows', 'mac').

1. Path to the executable inside the compressed package (firefox/firefox)
2. The download url for the package
3. The sha256 of the compressed package

```pyton
{
    "linux": ("firefox/firefox", "https://ftp.mozilla.org/pub/firefox/releases/82.0/linux-x86_64/en-US/firefox-82.0.tar.bz2", "4305f43e72aa46ae42882eaa4e436b22c5142a4c9b2dc9f9ccc3292e18a5e39a")
}
```
""",
    ),
}

def _get_last_url_part(u):
    """Get the last part of an url without the query strings

    Args:
        u: The full url as string
    Returns:
        the last part of the url as string
    """
    url = u.replace("%2F", "/")
    last_part = url[url.rindex("/") + 1:]

    query_string_index = last_part.find("?")

    if query_string_index > -1:
        # strip the query string away
        return last_part[:query_string_index]
    return last_part

def _browser_repository_impl(repository_ctx):
    platform = None

    if repository_ctx.os.name.lower().startswith("mac os"):
        platform = repository_ctx.attr.platforms["mac"]
    elif repository_ctx.os.name.lower().startswith("linux"):
        platform = repository_ctx.attr.platforms["linux"]
    elif repository_ctx.os.name.lower().find("windows") != -1:
        platform = repository_ctx.attr.platforms["windows"]

    executeable = platform[0]
    url = platform[1]
    sha256 = platform[2]

    # replace whitespaces in url with minus
    basename = _get_last_url_part(url).replace("%20", "-").replace(" ", "-")

    repository_ctx.report_progress("Downloading %s:" % repository_ctx.attr.browser_name.title())
    repository_ctx.download(
        url = url,
        output = basename,
        sha256 = sha256,
    )

    # For mac specific dmg files convert them to normal zip files
    if basename.endswith(".dmg"):
        zipfile = basename.replace(".dmg", ".zip")
        result = repository_ctx.execute([repository_ctx.path(Label("//internal/browsers:convert_dmg.sh")), basename, zipfile])
        basename = zipfile

        if result.return_code == 1:
            fail("Failed to convert .dmg file to zip: \n\n" + result.stderr)

    repository_ctx.extract(
        archive = basename,
        output = repository_ctx.attr.browser_name,
    )

    repository_ctx.file("%s/BUILD.bazel" % repository_ctx.attr.browser_name, """filegroup(
    name = "{browser}",
    srcs = ["{executable}"],
    visibility = ["//visibility:public"],
)
""".format(
        browser = repository_ctx.attr.browser_name,
        executable = executeable,
    ))

browser_repository = repository_rule(
    implementation = _browser_repository_impl,
    doc = _DOC,
    attrs = _ATTRS,
)

def browser_repositories(**kwargs):
    "Wrapper macro around the single browser repositories."

    browser_repository(
        name = "browsers_firefox",
        browser_name = "firefox",
        platforms = {
            "linux": ("firefox/firefox", "https://ftp.mozilla.org/pub/firefox/releases/82.0/linux-x86_64/en-US/firefox-82.0.tar.bz2", "4305f43e72aa46ae42882eaa4e436b22c5142a4c9b2dc9f9ccc3292e18a5e39a"),
            "mac": ("Firefox.app", "https://ftp.mozilla.org/pub/firefox/releases/82.0/mac/en-US/Firefox%2082.0.dmg", "5b651f2fa3c2d267c23184d29b6e6237af290575168e416ecef23128d94e8d5b"),
            "windows": ("firefox/firefox.exe", "https://archive.mozilla.org/pub/firefox/nightly/latest-mozilla-central/firefox-84.0a1.en-US.win64.zip", "c8cd8f2d55e32c100c0e2bd118582153a403ddf70b87f2566993b51414a1685e"),
        },
    )

    browser_repository(
        name = "browsers_chrome",
        browser_name = "chrome",
        platforms = {
            "linux": ("chrome-linux/chrome", "https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/Linux_x64%2F827837%2Fchrome-linux.zip?generation=1605552517971230&alt=media", "81f050dc14b37d56f99bca1b67e3d5f592a3edccb13340cdc205f602cab2af3a"),
            "mac": ("chrome-mac/Chromium.app", "https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/Mac%2F827804%2Fchrome-mac.zip?generation=1605549794339856&alt=media", "5139faf9463c020a8ec5d506756cdd5d1ba1454166f2c0d4eea809c05c357c9f"),
            "windows": ("chrome-win/chrome.exe", "https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/Win_x64%2F827827%2Fchrome-win.zip?generation=1605552276848019&alt=media", "ae6f77ea5565f8a8f1efa993f99ec0aa248cd80b97dc624cca0e1f01cc7d65ae"),
        },
    )
