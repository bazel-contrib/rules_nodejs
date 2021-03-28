<!-- *********************
title: Labs
toc: true
nav: rule
********************* -->
# Bazel nodejs Labs

This package contains experimental code which isn't at the same quality or stability standard as our main packages.

By using code in Labs, we trust that you understand:

- It might be deleted at any time
- We offer no support guarantees for using it
- Breaking changes can happen in any release
- We could release with bugs or other brokenness
- Documentation is sparse


## ts_proto_library

**USAGE**

<pre>
ts_proto_library(<a href="#ts_proto_library-name">name</a>, <a href="#ts_proto_library-proto">proto</a>)
</pre>



**ATTRIBUTES**


<h4 id="ts_proto_library-name">name</h4>

(*<a href="https://bazel.build/docs/build-ref.html#name">Name</a>, mandatory*): A unique name for this target.


<h4 id="ts_proto_library-proto">proto</h4>

(*<a href="https://bazel.build/docs/build-ref.html#labels">Label</a>, mandatory*)  The dependencies of this attribute must provide: ProtoInfo




