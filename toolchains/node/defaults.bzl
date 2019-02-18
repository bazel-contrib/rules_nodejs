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
"""
Defines defaults for the kubectl toolchain.
"""

# The following variables define the kubectl source repository that is pulled
# when the kubectl toolchain is configured to build from source.
# The repository is at https://github.com/kubernetes/kubernetes
# The kubernetes github organization.
k8s_org = "kubernetes"

# The kubernetes repository.
k8s_repo = "kubernetes"

# The release commit/tag to for the kubernetes repo.
k8s_commit = "v1.13.0-beta.1"

# The archive prefix. This is the name of the top level directory in the
# downloaded repository archive tarball.
k8s_prefix = "kubernetes-1.13.0-beta.1"

# The SHA256 of the k8s repo.
k8s_sha256 = "dfb39ce36284c1ce228954ca12bf016c09be61e40a875e8af4fff84e116bd3a7"

# The kubernetes repository infrastructure tools repository.
# https://github.com/kubernetes/repo-infra
k8s_repo_tools_repo = "repo-infra"

# The commit pin to use for the kuebernetes repository infrastructure tools
# repository.
k8s_repo_tools_commit = "b4bc4f1552c7fc1d4654753ca9b0e5e13883429f"

# The archive prefix. This is the name of the top level directory in the
# downloaded repository archive tarball.
k8s_repo_tools_prefix = "{}-{}".format(k8s_repo_tools_repo, k8s_repo_tools_commit)

# The SHA256 of the kubernetes repository infrastructure tools repository.
k8s_repo_tools_sha = "21160531ea8a9a4001610223ad815622bf60671d308988c7057168a495a7e2e8"
