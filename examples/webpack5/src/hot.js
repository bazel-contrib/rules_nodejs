// Export it
const hot = () => {
  // Create an element
  const domNode = document.createElement('p');
  // Set the text
  domNode.innerHTML = 'Hello Awesome World';
  return domNode;
};
export default hot;
