# mock_rules_kotlin

This is a fake implementation of the `@io_bazel_rules_kotlin` repository.

The only Kotlin code in our repo is in a nested workspace in //examples/kotlin
so the actual rules_kotlin is fetched there.

In the root workspace, we just need to make the loading phase able to load()
everything in the //examples:examples_kotlin target's transitive deps.
