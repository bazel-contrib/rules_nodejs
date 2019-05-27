# Fine-grained dependencies

Declaring the entire `node_modules` directory as an input to every nodejs action
has performance problems. When using local sandboxing, every file is set up in
the kernel container for the sandboxed disk, this is slow on Mac. With remote
execution, we guarantee these files all need to be copied to the worker machine.

Instead, we can declare individual npm packages as dependencies, e.g.:
```
nodejs_binary(
    name = "fast",
    data = ["@npm//jasmine"]
)
```

and only the contents of `node_modules/jasmine/` will be copied to workers.

See design doc:
https://docs.google.com/document/d/1AfjHMLVyE_vYwlHSK7k7yW_IIGppSxsQtPm9PTr1xEo/preview
