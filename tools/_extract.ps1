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

#
# Helper function to extract .tar file
#
function Expand-Tar($src, $dest) {
    if (-not (Get-Command Expand-7Zip -ErrorAction Ignore)) {
        Install-Package -Scope CurrentUser -Force 7Zip4PowerShell > $null
    }
    Expand-7Zip $src $dest
}

#
# Helper function to extract .gz file
#
Function Expand-GZip($src, $dest) {
    $input = New-Object System.IO.FileStream $src, ([IO.FileMode]::Open), ([IO.FileAccess]::Read), ([IO.FileShare]::Read)
    $output = New-Object System.IO.FileStream $dest, ([IO.FileMode]::Create), ([IO.FileAccess]::Write), ([IO.FileShare]::None)
    $gzipStream = New-Object System.IO.Compression.GzipStream $input, ([IO.Compression.CompressionMode]::Decompress)
    $buffer = New-Object byte[](1024)
    while ($true) {
        $read = $gzipstream.Read($buffer, 0, 1024)
        if ($read -le 0) {
            break
        }
        $output.Write($buffer, 0, $read)
    }
    $gzipStream.Close()
    $output.Close()
    $input.Close()
}

#
# Helper function to extract .tar.gz or .tgz file
#
function Expand-Tgz($src, $dest) {
    $tarFile = New-TemporaryFile
    Expand-GZip $src $tarFile
    Expand-Tar $tarFile $dest
    Remove-Item $tarFile
}

#
# Extract a file based on extension type
#
function Extract-File($src, $dest, $stripAlias) {
    if (($src -like "*.tar.gz") -or ($src -like "*.tgz")) {
        Expand-Tgz $src $dest
    } elseif ($src -like "*.zip") {
        Expand-Archive $src $dest
    } else {
        $info = New-Object System.IO.FileInfo($src)
        "Unsupported archive type " + $info.Name
        Exit 1
    }
    
    if ($stripAlias) {
        $stripPath = Join-Path -Path $dest -ChildPath $stripAlias
        $srcFiles = Get-ChildItem -Path $stripPath -Recurse -File -Name
        foreach ($srcFile in $srcFiles) {
            $srcPath = Join-Path -Path $stripPath -ChildPath $srcFile
            $destPath = Join-Path -Path $dest -ChildPath $srcFile
            $destDir = Split-Path $destPath
            New-Item -Path $destDir -ItemType directory -Force
            Move-Item -Path $srcPath -Destination $destPath
        }
        Remove-Item -Path $stripPath -Force -Recurse
    }
}

$src = $args[0]
$dest = $args[1]
$stripAlias = $args[2]

Extract-File $src $dest $stripAlias
