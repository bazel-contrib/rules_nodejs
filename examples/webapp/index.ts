import("./strings.en").then((m) => {
  const msg: HTMLDivElement = document.createElement("div");
  msg.innerText = m.hello();
  // For sourcemap testing, keep this string literal on line 6 column 21 !!
  msg.className = "ts1";
  document.body.appendChild(msg);
});
