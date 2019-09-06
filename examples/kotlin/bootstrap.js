// hello.js is created by the kt_js_library rule
import('./hello.js')
    // we dynamic load the Kotlin code because it brings in a Kotlin runtime dependency
    // In a real app we'd want to avoid doing that until the user visits a part of the application that requires it
    .then(m =>
              // Kotlin's JS emit will create a default export object
          // it has the function printHello that we defined in HelloWorld.kt
          m.default.printHello());
