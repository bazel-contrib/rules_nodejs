# Copyright 2018 The Bazel Authors. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Pinned browser versions tested against in https://github.com/bazelbuild/rules_typescript CI.
"""

load("@io_bazel_rules_webtesting//web/internal:platform_http_file.bzl", "platform_http_file")

def browser_repositories():
    """Load pinned rules_webtesting browser versions."""

    platform_http_file(
        name = "org_chromium_chromium",
        amd64_sha256 =
            "941de83d78b27d43db07f427136ba159d661bb111db8d9ffe12499b863a003e1",
        amd64_urls = [
            # Chromium 69.0.3497.0 (2018-07-19 snaphot 576668)
            # https://commondatastorage.googleapis.com/chromium-browser-snapshots/index.html?prefix=Linux_x64/576668/
            "https://commondatastorage.googleapis.com/chromium-browser-snapshots/Linux_x64/576668/chrome-linux.zip",
        ],
        licenses = ["notice"],  # BSD 3-clause (maybe more?)
        macos_sha256 =
            "bd01783e7d179e9f85d4b6f0c9df53118d13977cc7d365a1caa9d198c6afcfd8",
        macos_urls = [
            # Chromium 69.0.3497.0 (2018-07-19 snaphot 576668)
            # https://commondatastorage.googleapis.com/chromium-browser-snapshots/index.html?prefix=Mac/576668/
            # NOTE: There is an issue with ChromeHeadless on OSX chromium 70+
            "https://commondatastorage.googleapis.com/chromium-browser-snapshots/Mac/576668/chrome-mac.zip",
        ],
        windows_sha256 =
            "d1bb728118c12ea436d8ea07dba980789e7d860aa664dd1fad78bc20e8d9391c",
        windows_urls = [
            # Chromium 66.0.3359.0 (2018-03-01 snaphot 540270)
            # https://commondatastorage.googleapis.com/chromium-browser-snapshots/index.html?prefix=Win_x64/612439/
            # NOTE: There is an issue with chromium 68-71 with Windows: https://bugs.chromium.org/p/chromium/issues/detail?id=540270
            #       and pinning to 72 is not possible as the archive name has changed to chrome-win.zip which breaks
            #       as the executable path the hard-coded in rules_webtesting and includes the archive name.
            "https://commondatastorage.googleapis.com/chromium-browser-snapshots/Win_x64/540270/chrome-win32.zip",
        ],
    )

    platform_http_file(
        name = "org_chromium_chromedriver",
        amd64_sha256 =
            "687d2e15c42908e2911344c08a949461b3f20a83017a7a682ef4d002e05b5d46",
        amd64_urls = [
            # ChromeDriver 2.44 supports Chrome v69-71
            # http://chromedriver.chromium.org/downloads
            "https://chromedriver.storage.googleapis.com/2.44/chromedriver_linux64.zip",
        ],
        licenses = ["reciprocal"],  # BSD 3-clause, ICU, MPL 1.1, libpng (BSD/MIT-like), Academic Free License v. 2.0, BSD 2-clause, MIT
        macos_sha256 =
            "3fd49c2782a5f93cb48ff2dee021004d9a7fb393798e4c4807b391cedcd30ed9",
        macos_urls = [
            # ChromeDriver 2.44 supports Chrome v69-71
            # http://chromedriver.chromium.org/downloads
            "https://chromedriver.storage.googleapis.com/2.44/chromedriver_mac64.zip",
        ],
        windows_sha256 =
            "a8fa028acebef7b931ef9cb093f02865f9f7495e49351f556e919f7be77f072e",
        windows_urls = [
            # ChromeDriver 2.38 supports Chrome v65-67
            # http://chromedriver.chromium.org/downloads
            "https://chromedriver.storage.googleapis.com/2.38/chromedriver_win32.zip",
        ],
    )

    platform_http_file(
        name = "org_mozilla_firefox",
        amd64_sha256 =
            "3a729ddcb1e0f5d63933177a35177ac6172f12edbf9fbbbf45305f49333608de",
        amd64_urls = [
            "https://mirror.bazel.build/ftp.mozilla.org/pub/firefox/releases/61.0.2/linux-x86_64/en-US/firefox-61.0.2.tar.bz2",
            "https://ftp.mozilla.org/pub/firefox/releases/61.0.2/linux-x86_64/en-US/firefox-61.0.2.tar.bz2",
        ],
        licenses = ["reciprocal"],  # MPL 2.0
        macos_sha256 =
            "bf23f659ae34832605dd0576affcca060d1077b7bf7395bc9874f62b84936dc5",
        macos_urls = [
            "https://mirror.bazel.build/ftp.mozilla.org/pub/firefox/releases/61.0.2/mac/en-US/Firefox%2061.0.2.dmg",
            "https://ftp.mozilla.org/pub/firefox/releases/61.0.2/mac/en-US/Firefox%2061.0.2.dmg",
        ],
    )

    platform_http_file(
        name = "org_mozilla_geckodriver",
        amd64_sha256 =
            "c9ae92348cf00aa719be6337a608fae8304691a95668e8e338d92623ba9e0ec6",
        amd64_urls = [
            "https://mirror.bazel.build/github.com/mozilla/geckodriver/releases/download/v0.21.0/geckodriver-v0.21.0-linux64.tar.gz",
            "https://github.com/mozilla/geckodriver/releases/download/v0.21.0/geckodriver-v0.21.0-linux64.tar.gz",
        ],
        licenses = ["reciprocal"],  # MPL 2.0
        macos_sha256 =
            "ce4a3e9d706db94e8760988de1ad562630412fa8cf898819572522be584f01ce",
        macos_urls = [
            "https://mirror.bazel.build/github.com/mozilla/geckodriver/releases/download/v0.21.0/geckodriver-v0.21.0-macos.tar.gz",
            "https://github.com/mozilla/geckodriver/releases/download/v0.21.0/geckodriver-v0.21.0-macos.tar.gz",
        ],
    )
