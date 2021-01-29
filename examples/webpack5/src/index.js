// Import the component
import component from './hot';

// Initialize it
let demoComponent = component();

// Set it on the page
document.body.appendChild(demoComponent);

console.log('Hello World from your main file!');

// Enables the page to trigger with a hot module reload
if (import.meta.webpackHot) {
  // Watch the file `hot` for changes and execute a callback on it when it changes
  import.meta.webpackHot.accept('./hot', function() {
    // Initialize the component again with the change
    const nextComponent = component();

    // Replace old content with the hot loaded one
    document.body.replaceChild(nextComponent, demoComponent);

    demoComponent = nextComponent;
  })
}
