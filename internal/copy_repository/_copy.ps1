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

# This file name starts with an underscore as it is copied
# to the yarn_install/npm_install external repository before it is run.
# This makes it less likely to conflict with user data files.

$markerFile = $args[0]
$outDir = $args[1]
$srcDir = Split-Path $markerFile

$srcFiles = Get-ChildItem -Path $srcDir -Recurse -File -Name
foreach ($srcFile in $srcFiles) {
    $srcPath = Join-Path -Path $srcDir -ChildPath $srcFile
    $destPath = Join-Path -Path $outDir -ChildPath $srcFile
    $destDir = Split-Path $destPath
    New-Item -Path $destDir -ItemType directory -Force
    Copy-Item -Path $srcPath -Destination $destPath
}
